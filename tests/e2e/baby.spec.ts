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
  return `135${randomInt(10_000_000, 100_000_000)}`;
}

async function csrf(context: APIRequestContext): Promise<string> {
  const response = await context.get('/api/v1/auth/csrf');
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

async function registerAccount(): Promise<{ context: APIRequestContext; csrf: string }> {
  const context = await playwrightRequest.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      'X-Forwarded-For': `198.19.${randomInt(0, 256)}.${randomInt(1, 255)}`,
    },
  });
  const phone = syntheticPhone();
  const firstCsrf = await csrf(context);
  const challenge = await context.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin, 'x-csrf-token': firstCsrf },
    data: { phone, purpose: 'REGISTER' },
  });
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

test('enforces baby profile permissions, family scope, current-baby fallback, and recovery', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport-independent');
  const owner = await registerAccount();
  const member = await registerAccount();
  const familyResponse = await post(owner.context, '/api/v1/families', owner.csrf, {
    name: '宝宝测试家庭',
    displayName: '创建者',
  });
  const family = (await familyResponse.json()) as { id: string };
  const first = await post(owner.context, `/api/v1/families/${family.id}/babies`, owner.csrf, {
    nickname: '小星星',
    birthDate: '2026-01-02',
    sex: null,
  });
  expect(first.status()).toBe(201);
  const firstBaby = (await first.json()) as { id: string; nickname: string };
  const second = await post(owner.context, `/api/v1/families/${family.id}/babies`, owner.csrf, {
    nickname: '小星星',
    birthDate: '2025-06-01',
    sex: 'FEMALE',
  });
  expect(second.status()).toBe(201);
  const secondBaby = (await second.json()) as { id: string };
  expect(
    (
      (await owner.context.get('/api/v1/auth/session').then((response) => response.json())) as {
        activeBabyId: string;
      }
    ).activeBabyId,
  ).toBe(secondBaby.id);

  const invite = await post(owner.context, `/api/v1/families/${family.id}/invitations`, owner.csrf);
  const token = ((await invite.json()) as { token: string }).token;
  expect(
    (
      await post(member.context, '/api/v1/family-invitations/accept', member.csrf, {
        token,
        displayName: '普通成员',
      })
    ).status(),
  ).toBe(200);
  const memberList = await member.context.get(`/api/v1/families/${family.id}/babies`);
  expect(memberList.status()).toBe(200);
  expect(((await memberList.json()) as { items: unknown[] }).items).toHaveLength(2);
  const memberCreate = await post(
    member.context,
    `/api/v1/families/${family.id}/babies`,
    member.csrf,
    {
      nickname: '越权创建',
      birthDate: '2026-01-01',
    },
  );
  expect(memberCreate.status()).toBe(403);
  expect(((await memberCreate.json()) as { code: string }).code).toBe('BABY_PERMISSION_DENIED');

  const activateFirst = await post(
    owner.context,
    `/api/v1/families/${family.id}/babies/${firstBaby.id}/activate`,
    owner.csrf,
  );
  expect(((await activateFirst.json()) as { activeBabyId: string }).activeBabyId).toBe(
    firstBaby.id,
  );
  const archived = await post(
    owner.context,
    `/api/v1/families/${family.id}/babies/${firstBaby.id}/archive`,
    owner.csrf,
  );
  expect(archived.status()).toBe(200);
  expect(((await archived.json()) as { activeBabyId: string }).activeBabyId).toBe(secondBaby.id);
  const hidden = await member.context.get(`/api/v1/families/${family.id}/babies/${firstBaby.id}`);
  expect(hidden.status()).toBe(404);
  const restored = await post(
    owner.context,
    `/api/v1/families/${family.id}/babies/${firstBaby.id}/restore`,
    owner.csrf,
  );
  expect(restored.status()).toBe(200);
  expect(((await restored.json()) as { nickname: string }).nickname).toBe('小星星');
  expect(
    (
      (await owner.context.get('/api/v1/auth/session').then((response) => response.json())) as {
        activeBabyId: string;
      }
    ).activeBabyId,
  ).toBe(firstBaby.id);

  const otherFamily = await post(owner.context, '/api/v1/families', owner.csrf, {
    name: '隔离家庭',
    displayName: '创建者',
  });
  const otherFamilyId = ((await otherFamily.json()) as { id: string }).id;
  const crossFamily = await owner.context.get(
    `/api/v1/families/${otherFamilyId}/babies/${firstBaby.id}`,
  );
  expect(crossFamily.status()).toBe(404);
  expect(((await crossFamily.json()) as { code: string }).code).toBe('BABY_NOT_FOUND');
  await owner.context.dispose();
  await member.context.dispose();
});

test('creates a baby profile from the responsive family application without horizontal overflow', async ({
  page,
}) => {
  const phone = syntheticPhone();
  await page.goto('/register');
  await page.getByLabel('手机号').fill(phone);
  await page.getByRole('button', { name: '获取验证码' }).click();
  await page.getByLabel('验证码').fill('246810');
  await page.getByLabel('设置密码').fill('abcdef');
  await page.getByLabel('确认密码').fill('abcdef');
  await page.getByLabel(/我已阅读并同意/).check();
  await page.getByRole('button', { name: '注册并登录' }).click();
  await page.getByLabel('家庭名称').fill('合成成长家庭');
  await page.getByLabel('你在家庭中的称呼').fill('合成创建者');
  await page.getByRole('button', { name: '创建家庭', exact: true }).click();
  await expect(page.getByRole('heading', { name: '合成成长家庭' })).toBeVisible();
  await page.goto('/app/babies/new');
  await expect(page.getByRole('heading', { name: '记录成长故事的主角' })).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page).toHaveURL(/\/app\/babies\/manage$/);
  await expect(page.getByText('家庭中还没有宝宝档案。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '宝宝档案' })).toBeFocused();
  await page.getByRole('link', { name: '新建档案' }).click();
  await page.getByLabel('宝宝昵称').fill('小星星');
  await page.getByLabel('出生日期').fill('2026-01-02');
  await page.getByRole('button', { name: '性别（选填）' }).click();
  await expect(page.getByRole('listbox', { name: '性别（选填）' })).toBeVisible();
  await page.getByRole('option', { name: '女宝宝' }).click();
  await page.getByRole('button', { name: '创建宝宝档案' }).click();
  await expect(page.getByRole('heading', { name: '小星星' })).toBeVisible();
  await expect(page.getByText(/女宝宝/)).toBeVisible();
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
  await page.goto('/app/babies/manage');
  await expect(page.getByRole('button', { name: /小星星.*当前宝宝/ })).toBeVisible();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  const editActions = page.locator('section[aria-label^="编辑"]');
  const cancel = editActions.getByRole('button', { name: '取消' });
  const save = editActions.getByRole('button', { name: '保存修改' });
  const [cancelBox, saveBox] = await Promise.all([cancel.boundingBox(), save.boundingBox()]);
  expect(cancelBox).not.toBeNull();
  expect(saveBox).not.toBeNull();
  expect(Math.abs(cancelBox!.height - saveBox!.height)).toBeLessThanOrEqual(1);
  expect(saveBox!.height).toBe(44);
  await cancel.click();
  await expect(editActions).toHaveCount(0);
});
