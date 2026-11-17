import { expect, test } from '@playwright/test';
import {
  accountContext,
  adminContext,
  csrf,
  issueAccount,
  login,
  loginInBrowser,
  post,
  provisionAccount,
  webOrigin,
} from './managed-fixtures';

test('requires Origin and CSRF and retires public credential endpoints', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport independent');
  const context = await accountContext();
  try {
    const token = await csrf(context);
    expect(
      (
        await context.post('/api/v1/auth/login/password', {
          headers: { 'x-csrf-token': token },
          data: { username: 'test', password: 'abcdef' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.post('/api/v1/auth/login/password', {
          headers: { Origin: webOrigin },
          data: { username: 'test', password: 'abcdef' },
        })
      ).status(),
    ).toBe(403);
    for (const path of [
      'auth/register',
      'auth/verification-challenges',
      'auth/login/code',
      'auth/password/reset',
      'family-invitations/accept',
    ]) {
      expect((await post(context, `/api/v1/${path}`, token, {})).status()).toBe(404);
    }
  } finally {
    await context.dispose();
  }
});

test('restricts initial sessions, rotates credentials, and revokes old sessions', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport independent');
  const credential = await issueAccount();
  const first = await accountContext();
  const second = await accountContext();
  const admin = await adminContext();
  try {
    const anonymous = await csrf(first);
    const signedIn = await login(first, credential.username, credential.temporaryPassword);
    expect(await signedIn.json()).toMatchObject({
      mustChangePassword: true,
      mustAcceptTerms: true,
    });
    expect(await csrf(first)).not.toBe(anonymous);
    expect((await first.get('/api/v1/families')).status()).toBe(403);
    await login(second, credential.username, credential.temporaryPassword);
    const token = await csrf(first);
    expect(
      (
        await post(first, '/api/v1/auth/password/change', token, {
          currentPassword: credential.temporaryPassword,
          newPassword: 'changed-password',
        })
      ).status(),
    ).toBe(400);
    const changed = await post(first, '/api/v1/auth/password/change', token, {
      currentPassword: credential.temporaryPassword,
      newPassword: 'changed-password',
      acceptTerms: true,
    });
    expect(changed.status()).toBe(200);
    expect(await changed.json()).toMatchObject({
      mustChangePassword: false,
      mustAcceptTerms: false,
    });
    expect((await second.get('/api/v1/auth/session')).status()).toBe(401);
    expect((await first.get('/api/v1/families')).status()).toBe(200);
    const accounts = (await (await admin.get('/api/v1/management/accounts')).json()) as {
      id: string;
      username: string;
    }[];
    const id = accounts.find((account) => account.username === credential.username)!.id;
    const reset = await post(
      admin,
      `/api/v1/management/accounts/${id}/password`,
      await csrf(admin),
    );
    expect(reset.status()).toBe(200);
    expect(reset.headers()['cache-control']).toBe('no-store');
    expect((await first.get('/api/v1/auth/session')).status()).toBe(401);
    expect(
      (
        await post(second, '/api/v1/auth/login/password', await csrf(second), {
          username: credential.username,
          password: 'changed-password',
        })
      ).status(),
    ).toBe(401);
  } finally {
    await Promise.all([first.dispose(), second.dispose(), admin.dispose()]);
  }
});

test('signs in with an existing username and can sign out', async ({ page }) => {
  const account = await provisionAccount();
  await loginInBrowser(page, account.username, account.password);
  await account.context.dispose();
  await expect(page.getByRole('heading', { name: '等待加入家庭' })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    await page.getByRole('button', { name: '打开家庭切换器' }).click();
  }
  await page.getByRole('button', { name: '退出登录' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('keeps protected content hidden while session recovery is unresolved', async ({ page }) => {
  await page.route('**/api/v1/auth/session', () => undefined);
  await page.goto('/admin');
  await expect(page.getByText('正在恢复安全会话…')).toBeVisible();
  await expect(page.getByRole('heading', { name: '超管后台' })).toHaveCount(0);
});

test('shows keyboard validation and rejects a retired registration route', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByLabel('账户名')).toHaveCount(0);
  await page.goto('/login');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByText('请输入有效的账户名')).toBeVisible();
  await expect(page.getByLabel('账户名')).toBeFocused();
});
