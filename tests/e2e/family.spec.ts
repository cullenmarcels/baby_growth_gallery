import { expect, test } from '@playwright/test';
import {
  accountContext,
  login,
  adminContext,
  assignMember,
  changeMemberRole,
  createManagedFamily,
  csrf,
  loginInBrowser,
  post,
  provisionAccount,
  syntheticUsername,
  webOrigin,
} from './managed-fixtures';

test('enforces global and family administration boundaries and keeps family roles independent', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport independent');
  const admin = await adminContext();
  const owner = await provisionAccount();
  const member = await provisionAccount();
  try {
    const first = await createManagedFamily(owner, '权限家庭一', '首位家管');
    const second = await createManagedFamily(member, '权限家庭二', '第二家管');
    expect(await assignMember(first.id, member.username, '跨家庭成员')).toBe(204);
    const manageFirst = `/api/v1/management/families/${first.id}`;
    const manageSecond = `/api/v1/management/families/${second.id}`;
    const detail = (await (await owner.context.get(manageFirst)).json()) as {
      members: { id: string; username: string; role: string }[];
    };
    const memberId = detail.members.find((entry) => entry.username === member.username)!.id;
    const ownerMembershipId = detail.members.find((entry) => entry.username === owner.username)!.id;
    expect((await admin.get(`/api/v1/families/${first.id}/babies`)).status()).toBe(404);
    expect((await member.context.get(manageFirst)).status()).toBe(403);
    expect((await owner.context.get(manageSecond)).status()).toBe(404);
    expect(
      (
        await post(owner.context, '/api/v1/management/families', owner.csrf, { name: '越权家庭' })
      ).status(),
    ).toBe(403);
    expect(
      (
        await owner.context.patch(`${manageFirst}/members/${memberId}`, {
          headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf },
          data: { role: 'ADMIN' },
        })
      ).status(),
    ).toBe(403);
    expect(await changeMemberRole(first.id, ownerMembershipId, 'MEMBER')).toBe(409);
    const token = await csrf(admin);
    expect(
      (
        await admin.delete(`${manageFirst}/members/${ownerMembershipId}`, {
          headers: { Origin: webOrigin, 'x-csrf-token': token },
        })
      ).status(),
    ).toBe(409);
    const accounts = (await (await admin.get('/api/v1/management/accounts')).json()) as {
      id: string;
      username: string;
    }[];
    const ownerId = accounts.find((entry) => entry.username === owner.username)!.id;
    expect(
      (
        await admin.patch(`/api/v1/management/accounts/${ownerId}/status`, {
          headers: { Origin: webOrigin, 'x-csrf-token': token },
          data: { status: 'DISABLED' },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await owner.context.delete(`${manageFirst}/members/${memberId}`, {
          headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf },
        })
      ).status(),
    ).toBe(204);
    expect((await member.context.get(`/api/v1/families/${first.id}`)).status()).toBe(404);
    expect((await member.context.get(manageSecond)).status()).toBe(200);
    const page = await owner.context.get(`/api/v1/families/${first.id}/activities?limit=2`);
    expect(page.status()).toBe(200);
    const activity = (await page.json()) as { items: { type: string }[]; nextCursor: string };
    expect(activity.items.map(({ type }) => type)).toEqual(['MEMBER_LEFT', 'MEMBER_JOINED']);
    expect(activity.nextCursor).toBeTruthy();
    expect(
      (
        await owner.context.get(
          `/api/v1/families/${first.id}/activities?cursor=${encodeURIComponent(activity.nextCursor)}`,
        )
      ).status(),
    ).toBe(200);
  } finally {
    await Promise.all([admin.dispose(), owner.context.dispose(), member.context.dispose()]);
  }
});

test('family-issued credentials prevent promotion and cross-family assignment until changed', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport independent');
  const owner = await provisionAccount();
  const admin = await adminContext();
  try {
    const family = await createManagedFamily(owner, '开户家庭', '家管');
    const other = await createManagedFamily(owner, '其它家庭', '家管');
    const base = `/api/v1/management/families/${family.id}`;
    const username = syntheticUsername();
    const result = await post(owner.context, `${base}/accounts`, owner.csrf, {
      username,
      displayName: '新成员',
    });
    expect(result.status()).toBe(201);
    expect(await assignMember(other.id, username, '异家成员')).toBe(409);
    const detail = (await (await owner.context.get(base)).json()) as {
      members: { username: string; id: string }[];
    };
    const id = detail.members.find((entry) => entry.username === username)!.id;
    expect(await changeMemberRole(family.id, id, 'ADMIN')).toBe(409);

    const reset = await post(owner.context, `${base}/members/${id}/password`, owner.csrf);
    expect(reset.status()).toBe(200);
    const member = await accountContext();
    try {
      const { temporaryPassword } = (await reset.json()) as { temporaryPassword: string };
      await login(member, username, temporaryPassword);
      expect(
        (
          await post(member, '/api/v1/auth/password/change', await csrf(member), {
            currentPassword: temporaryPassword,
            newPassword: 'member-private-password',
            acceptTerms: true,
          })
        ).status(),
      ).toBe(200);
      expect(await assignMember(other.id, username, '异家成员')).toBe(204);
      expect(
        (await post(owner.context, `${base}/members/${id}/password`, owner.csrf)).status(),
      ).toBe(403);
      const accounts = (await (await admin.get('/api/v1/management/accounts')).json()) as {
        username: string;
        id: string;
      }[];
      const accountId = accounts.find((entry) => entry.username === username)!.id;
      for (const status of ['DISABLED', 'DISABLED']) {
        const changed = await admin.patch(`/api/v1/management/accounts/${accountId}/status`, {
          headers: { Origin: webOrigin, 'x-csrf-token': await csrf(admin) },
          data: { status },
        });
        expect(changed.status()).toBe(200);
        expect(Object.keys(await changed.json()).sort()).toEqual([
          'displayName',
          'id',
          'status',
          'username',
        ]);
      }
      expect((await member.get('/api/v1/auth/session')).status()).toBe(401);
    } finally {
      await member.dispose();
    }
    expect(
      (
        await post(admin, '/api/v1/management/accounts', await csrf(admin), {
          username: username.toUpperCase(),
          displayName: '重复名',
        })
      ).status(),
    ).toBe(409);
  } finally {
    await Promise.all([admin.dispose(), owner.context.dispose()]);
  }
});

test('family administrator provisions a member who changes their password in the browser', async ({
  page,
  browser,
}) => {
  const manager = await provisionAccount();
  const family = await createManagedFamily(manager, '三视口开户家庭', '合成家管');
  await loginInBrowser(page, manager.username, manager.password);
  await manager.context.dispose();
  await expect(page).toHaveURL(/\/app\/babies\/new$/);
  await page.goto(`/app/families/${family.id}/manage`);
  await expect(page.getByRole('heading', { name: '家庭管理' })).toBeVisible();
  const username = syntheticUsername();
  await page.getByLabel('账户名', { exact: true }).first().fill(username);
  await page.getByLabel('显示名', { exact: true }).first().fill('开户成员');
  await page.getByRole('button', { name: '开户入户' }).click();
  const credential = page.getByRole('region', { name: '临时密码' });
  const password = await credential.locator('code').innerText();
  await credential.getByRole('button', { name: '关闭' }).click();
  await expect(credential).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  const user = await browser.newContext({ baseURL: page.url(), viewport: page.viewportSize() });
  try {
    const memberPage = await user.newPage();
    await loginInBrowser(memberPage, username, password);
    await expect(memberPage).toHaveURL(/\/change-password$/);
    await memberPage.getByLabel('当前密码').fill(password);
    await memberPage.getByLabel('新密码').fill('private-new-password');
    await memberPage.getByLabel('我已阅读并同意条款').check();
    await memberPage.getByRole('button', { name: '保存密码' }).click();
    await expect(memberPage).toHaveURL(/\/app\/babies\/waiting$/);
  } finally {
    await user.close();
  }
});
