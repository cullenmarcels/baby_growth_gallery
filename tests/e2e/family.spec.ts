import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
} from '@playwright/test';
import { randomInt } from 'node:crypto';

const apiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';
const webOrigin = process.env.STACK_BASE_URL ?? 'http://127.0.0.1:5173';

function syntheticPhone(): string {
  return `136${randomInt(10_000_000, 100_000_000)}`;
}

async function csrf(context: APIRequestContext): Promise<string> {
  const response = await context.get('/api/v1/auth/csrf');
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

async function registerAccount(): Promise<{ context: APIRequestContext; csrf: string }> {
  const context = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
  const phone = syntheticPhone();
  const firstCsrf = await csrf(context);
  const challenge = await context.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin, 'x-csrf-token': firstCsrf },
    data: { phone, purpose: 'REGISTER' },
  });
  expect(challenge.status()).toBe(202);
  const challengeId = ((await challenge.json()) as { challengeId: string }).challengeId;
  const registration = await context.post('/api/v1/auth/register', {
    headers: { Origin: webOrigin, 'x-csrf-token': firstCsrf },
    data: {
      phone,
      challengeId,
      code: '246810',
      password: 'abcdef',
      termsVersion: 'draft-2026-09-10',
      privacyVersion: 'draft-2026-09-10',
    },
  });
  expect(registration.status()).toBe(201);
  return { context, csrf: await csrf(context) };
}

async function post(context: APIRequestContext, path: string, token: string, data?: unknown) {
  return context.post(path, {
    headers: { Origin: webOrigin, 'x-csrf-token': token },
    ...(data === undefined ? {} : { data }),
  });
}

test('creates a family, consumes an invitation once, enforces roles, and records activity', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport-independent');
  const owner = await registerAccount();
  const member = await registerAccount();

  const created = await post(owner.context, '/api/v1/families', owner.csrf, {
    name: '  星光小家  ',
    displayName: '  创建者甲  ',
  });
  expect(created.status()).toBe(201);
  const family = (await created.json()) as {
    id: string;
    name: string;
    currentMembership: { id: string; role: string; displayName: string };
  };
  expect(family).toMatchObject({
    name: '星光小家',
    currentMembership: { role: 'OWNER', displayName: '创建者甲' },
  });

  const invitationResponse = await post(
    owner.context,
    `/api/v1/families/${family.id}/invitations`,
    owner.csrf,
  );
  expect(invitationResponse.status()).toBe(201);
  const invitation = (await invitationResponse.json()) as { token: string };
  expect(invitation.token).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){2}$/);
  const invitationList = await owner.context.get(`/api/v1/families/${family.id}/invitations`);
  expect(await invitationList.text()).not.toContain(invitation.token);

  const accepted = await post(member.context, '/api/v1/family-invitations/accept', member.csrf, {
    token: invitation.token.toLowerCase().replaceAll('-', ' '),
    displayName: '成员乙',
  });
  expect(accepted.status()).toBe(200);
  const acceptedBody = (await accepted.json()) as { account: { activeFamilyId: string } };
  expect(acceptedBody.account.activeFamilyId).toBe(family.id);

  const replay = await post(member.context, '/api/v1/family-invitations/accept', member.csrf, {
    token: invitation.token,
    displayName: '成员乙',
  });
  expect(replay.status()).toBe(400);
  expect(((await replay.json()) as { code: string }).code).toBe('INVITATION_INVALID');

  const membersResponse = await owner.context.get(`/api/v1/families/${family.id}/members`);
  const members = (await membersResponse.json()) as {
    items: Array<{ id: string; role: string; displayName: string }>;
  };
  const joined = members.items.find((item) => item.displayName === '成员乙');
  expect(joined?.role).toBe('MEMBER');

  const promote = await owner.context.patch(
    `/api/v1/families/${family.id}/members/${joined?.id}/role`,
    {
      headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf },
      data: { role: 'ADMIN' },
    },
  );
  expect(promote.status()).toBe(200);

  const adminCannotRemoveOwner = await member.context.delete(
    `/api/v1/families/${family.id}/members/${family.currentMembership.id}`,
    { headers: { Origin: webOrigin, 'x-csrf-token': member.csrf } },
  );
  expect(adminCannotRemoveOwner.status()).toBe(409);
  expect(((await adminCannotRemoveOwner.json()) as { code: string }).code).toBe(
    'FAMILY_OWNER_REQUIRED',
  );

  const activitiesResponse = await owner.context.get(
    `/api/v1/families/${family.id}/activities?limit=2`,
  );
  expect(activitiesResponse.status()).toBe(200);
  const firstPage = (await activitiesResponse.json()) as {
    items: Array<{ type: string }>;
    nextCursor: string | null;
  };
  expect(firstPage.items).toHaveLength(2);
  expect(firstPage.nextCursor).toBeTruthy();
  expect(firstPage.items.map((item) => item.type)).toEqual([
    'MEMBER_ROLE_CHANGED',
    'MEMBER_JOINED',
  ]);
  const secondPage = await owner.context.get(
    `/api/v1/families/${family.id}/activities?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor!)}`,
  );
  expect((await secondPage.json()) as { items: Array<{ type: string }> }).toMatchObject({
    items: [{ type: 'FAMILY_CREATED' }],
  });

  await owner.context.dispose();
  await member.context.dispose();
});

test('revokes invitations after privilege loss and restores a prior membership as MEMBER', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport-independent');
  const owner = await registerAccount();
  const returningMember = await registerAccount();
  const outsider = await registerAccount();
  const created = await post(owner.context, '/api/v1/families', owner.csrf, {
    name: '重逢之家',
    displayName: '创建者',
  });
  const family = (await created.json()) as { id: string };

  const firstInvitation = await post(
    owner.context,
    `/api/v1/families/${family.id}/invitations`,
    owner.csrf,
  );
  const firstToken = ((await firstInvitation.json()) as { token: string }).token;
  expect(
    (
      await post(
        returningMember.context,
        '/api/v1/family-invitations/accept',
        returningMember.csrf,
        { token: firstToken, displayName: '归来成员' },
      )
    ).status(),
  ).toBe(200);
  const memberList = (await (
    await owner.context.get(`/api/v1/families/${family.id}/members`)
  ).json()) as { items: Array<{ id: string; displayName: string }> };
  const originalMembership = memberList.items.find((item) => item.displayName === '归来成员')!;

  const promoted = await owner.context.patch(
    `/api/v1/families/${family.id}/members/${originalMembership.id}/role`,
    {
      headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf },
      data: { role: 'ADMIN' },
    },
  );
  expect(promoted.status()).toBe(200);
  const adminInvitation = await post(
    returningMember.context,
    `/api/v1/families/${family.id}/invitations`,
    returningMember.csrf,
  );
  const adminToken = ((await adminInvitation.json()) as { token: string }).token;
  const demoted = await owner.context.patch(
    `/api/v1/families/${family.id}/members/${originalMembership.id}/role`,
    {
      headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf },
      data: { role: 'MEMBER' },
    },
  );
  expect(demoted.status()).toBe(200);
  const invalidAfterDemotion = await post(
    outsider.context,
    '/api/v1/family-invitations/accept',
    outsider.csrf,
    { token: adminToken, displayName: '外部成员' },
  );
  expect(invalidAfterDemotion.status()).toBe(400);
  expect(((await invalidAfterDemotion.json()) as { code: string }).code).toBe('INVITATION_INVALID');

  const left = await returningMember.context.delete(`/api/v1/families/${family.id}/membership`, {
    headers: { Origin: webOrigin, 'x-csrf-token': returningMember.csrf },
  });
  expect(left.status()).toBe(200);
  const rejoinInvitation = await post(
    owner.context,
    `/api/v1/families/${family.id}/invitations`,
    owner.csrf,
  );
  const rejoinToken = ((await rejoinInvitation.json()) as { token: string }).token;
  const rejoined = await post(
    returningMember.context,
    '/api/v1/family-invitations/accept',
    returningMember.csrf,
    { token: rejoinToken, displayName: '重新加入' },
  );
  expect(rejoined.status()).toBe(200);
  const restoredMembers = (await (
    await owner.context.get(`/api/v1/families/${family.id}/members`)
  ).json()) as { items: Array<{ id: string; displayName: string; role: string }> };
  expect(restoredMembers.items.find((item) => item.id === originalMembership.id)).toMatchObject({
    displayName: '重新加入',
    role: 'MEMBER',
  });
  const activities = (await (
    await owner.context.get(`/api/v1/families/${family.id}/activities?limit=20`)
  ).json()) as { items: Array<{ type: string; summary: { joinKind?: string } }> };
  expect(
    activities.items.some(
      (item) => item.type === 'MEMBER_JOINED' && item.summary.joinKind === 'REJOINED',
    ),
  ).toBe(true);

  await owner.context.dispose();
  await returningMember.context.dispose();
  await outsider.context.dispose();
});

test('reconciles an invalid current family to the most recently joined active membership', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport-independent');
  const owner = await registerAccount();
  const multiFamilyMember = await registerAccount();

  const firstFamilyResponse = await post(owner.context, '/api/v1/families', owner.csrf, {
    name: '第一家庭',
    displayName: '主人',
  });
  const firstFamily = (await firstFamilyResponse.json()) as { id: string };
  const inviteResponse = await post(
    owner.context,
    `/api/v1/families/${firstFamily.id}/invitations`,
    owner.csrf,
  );
  const token = ((await inviteResponse.json()) as { token: string }).token;
  const joined = await post(
    multiFamilyMember.context,
    '/api/v1/family-invitations/accept',
    multiFamilyMember.csrf,
    {
      token,
      displayName: '访客',
    },
  );
  expect(joined.status()).toBe(200);

  const secondFamilyResponse = await post(
    multiFamilyMember.context,
    '/api/v1/families',
    multiFamilyMember.csrf,
    { name: '第二家庭', displayName: '主人乙' },
  );
  expect(secondFamilyResponse.status()).toBe(201);
  const secondFamily = (await secondFamilyResponse.json()) as { id: string };
  const activateFirst = await post(
    multiFamilyMember.context,
    `/api/v1/families/${firstFamily.id}/activate`,
    multiFamilyMember.csrf,
  );
  expect(activateFirst.status()).toBe(200);
  expect(((await activateFirst.json()) as { activeFamilyId: string }).activeFamilyId).toBe(
    firstFamily.id,
  );

  const memberList = (await (
    await owner.context.get(`/api/v1/families/${firstFamily.id}/members`)
  ).json()) as { items: Array<{ id: string; isCurrentAccount: boolean }> };
  const target = memberList.items.find((item) => !item.isCurrentAccount)!;
  const removed = await owner.context.delete(
    `/api/v1/families/${firstFamily.id}/members/${target.id}`,
    { headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf } },
  );
  expect(removed.status()).toBe(204);

  const session = await multiFamilyMember.context.get('/api/v1/auth/session');
  expect(((await session.json()) as { activeFamilyId: string }).activeFamilyId).toBe(
    secondFamily.id,
  );

  await owner.context.dispose();
  await multiFamilyMember.context.dispose();
});

test('creates a real family from onboarding without horizontal overflow', async ({ page }) => {
  const phone = syntheticPhone();
  await page.goto('/register');
  await page.getByLabel('手机号').fill(phone);
  await page.getByRole('button', { name: '获取验证码' }).click();
  await page.getByLabel('验证码').fill('246810');
  await page.getByLabel('设置密码').fill('abcdef');
  await page.getByLabel('确认密码').fill('abcdef');
  await page.getByLabel(/我已阅读并同意/).check();
  await page.getByRole('button', { name: '注册并登录' }).click();
  await expect(page.getByRole('heading', { name: '把珍贵时刻分享给最亲近的人' })).toBeVisible();
  await page.getByLabel('家庭名称').fill('晨光之家');
  await page.getByLabel('你在家庭中的称呼').fill('家人甲');
  await page.getByRole('button', { name: '创建家庭', exact: true }).click();
  await expect(page.getByRole('heading', { name: '晨光之家' })).toBeVisible();
  await expect(page.getByText('家人甲 · 创建者')).toBeVisible();
  await expect(page.getByText(/创建了家庭/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    await expect(page.getByRole('navigation', { name: '移动端主导航' })).toBeVisible();
  } else {
    await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
  }
  if (process.platform === 'win32') {
    await expect(page).toHaveScreenshot('family-space.png', {
      animations: 'disabled',
      mask: [page.locator('time')],
    });
  }
  await page.getByRole('button', { name: '生成一次性邀请' }).click();
  const token = page.getByText(/^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){2}$/);
  await expect(token).toBeVisible();
  const tokenValue = await token.textContent();
  await page.getByRole('button', { name: '关闭一次性邀请口令' }).click();
  await expect(page.getByText(tokenValue ?? 'token-missing')).toHaveCount(0);
});
