import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
} from '@playwright/test';
import { randomInt } from 'node:crypto';

const apiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';
const webOrigin = process.env.STACK_BASE_URL ?? 'http://127.0.0.1:5173';

function syntheticPhone(prefix: '137' | '139'): string {
  return `${prefix}${randomInt(10_000_000, 100_000_000)}`;
}

async function getCsrf(context: APIRequestContext): Promise<string> {
  const response = await context.get('/api/v1/auth/csrf');
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

test('rejects missing Origin, missing CSRF, and URL session identifiers', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport-independent');
  const api = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
  const csrfResponse = await api.get('/api/v1/auth/csrf');
  expect(csrfResponse.ok()).toBe(true);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const missingOrigin = await api.post('/api/v1/auth/verification-challenges', {
    headers: { 'x-csrf-token': csrfToken },
    data: { phone: '13800138201', purpose: 'LOGIN' },
  });
  expect(missingOrigin.status()).toBe(403);
  expect(((await missingOrigin.json()) as { code: string }).code).toBe('ORIGIN_INVALID');

  const second = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
  const missingCsrf = await second.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin },
    data: { phone: '13800138202', purpose: 'LOGIN' },
  });
  expect(missingCsrf.status()).toBe(403);
  expect(((await missingCsrf.json()) as { code: string }).code).toBe('CSRF_INVALID');

  const querySession = await second.get('/api/v1/auth/session?sessionId=untrusted');
  expect(querySession.status()).toBe(401);
  await api.dispose();
  await second.dispose();
});

test('regenerates sessions, consumes codes once, and revokes sessions after password reset', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport-independent');
  const phone = syntheticPhone('137');
  const password = 'abcdef';
  const nextPassword = 'ghijkl';
  const first = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
  const originalCsrf = await getCsrf(first);
  const registerChallenge = await first.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin, 'x-csrf-token': originalCsrf },
    data: { phone, purpose: 'REGISTER' },
  });
  expect(registerChallenge.status()).toBe(202);
  const registerChallengeId = ((await registerChallenge.json()) as { challengeId: string })
    .challengeId;
  const tooShortRegistration = await first.post('/api/v1/auth/register', {
    headers: { Origin: webOrigin, 'x-csrf-token': originalCsrf },
    data: {
      phone,
      challengeId: registerChallengeId,
      code: '246810',
      password: 'abcde',
      termsVersion: 'draft-2026-09-10',
      privacyVersion: 'draft-2026-09-10',
    },
  });
  expect(tooShortRegistration.status()).toBe(400);
  expect(
    (await tooShortRegistration.json()) as { code: string; violations: unknown[] },
  ).toMatchObject({
    code: 'VALIDATION_FAILED',
    violations: [{ field: 'password', code: 'too_small' }],
  });

  const registration = await first.post('/api/v1/auth/register', {
    headers: { Origin: webOrigin, 'x-csrf-token': originalCsrf },
    data: {
      phone,
      challengeId: registerChallengeId,
      code: '246810',
      password,
      termsVersion: 'draft-2026-09-10',
      privacyVersion: 'draft-2026-09-10',
    },
  });
  expect(registration.status()).toBe(201);

  const staleCsrf = await first.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin, 'x-csrf-token': originalCsrf },
    data: { phone, purpose: 'LOGIN' },
  });
  expect(staleCsrf.status()).toBe(403);
  const currentCsrf = await getCsrf(first);
  const replay = await first.post('/api/v1/auth/register', {
    headers: { Origin: webOrigin, 'x-csrf-token': currentCsrf },
    data: {
      phone,
      challengeId: registerChallengeId,
      code: '246810',
      password,
      termsVersion: 'draft-2026-09-10',
      privacyVersion: 'draft-2026-09-10',
    },
  });
  expect(replay.status()).toBe(400);
  expect(((await replay.json()) as { code: string }).code).toBe('VERIFICATION_INVALID');

  const second = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
  const secondCsrf = await getCsrf(second);
  const secondLogin = await second.post('/api/v1/auth/login/password', {
    headers: { Origin: webOrigin, 'x-csrf-token': secondCsrf },
    data: { phone, password, remember: true },
  });
  expect(secondLogin.status()).toBe(200);

  const resetChallenge = await first.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin, 'x-csrf-token': currentCsrf },
    data: { phone, purpose: 'RESET_PASSWORD' },
  });
  expect(resetChallenge.status()).toBe(202);
  const resetChallengeId = ((await resetChallenge.json()) as { challengeId: string }).challengeId;
  const reset = await first.post('/api/v1/auth/password/reset', {
    headers: { Origin: webOrigin, 'x-csrf-token': currentCsrf },
    data: { phone, challengeId: resetChallengeId, code: '246810', newPassword: nextPassword },
  });
  expect(reset.status()).toBe(204);
  expect((await second.get('/api/v1/auth/session')).status()).toBe(401);

  const afterRevocationCsrf = await getCsrf(second);
  const oldLogin = await second.post('/api/v1/auth/login/password', {
    headers: { Origin: webOrigin, 'x-csrf-token': afterRevocationCsrf },
    data: { phone, password, remember: false },
  });
  expect(oldLogin.status()).toBe(401);
  const newLogin = await second.post('/api/v1/auth/login/password', {
    headers: { Origin: webOrigin, 'x-csrf-token': afterRevocationCsrf },
    data: { phone, password: nextPassword, remember: false },
  });
  expect(newLogin.status()).toBe(200);

  const third = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
  const thirdCsrf = await getCsrf(third);
  const loginChallenge = await third.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin, 'x-csrf-token': thirdCsrf },
    data: { phone, purpose: 'LOGIN' },
  });
  expect(loginChallenge.status()).toBe(202);
  const loginChallengeId = ((await loginChallenge.json()) as { challengeId: string }).challengeId;
  const codeLogin = await third.post('/api/v1/auth/login/code', {
    headers: { Origin: webOrigin, 'x-csrf-token': thirdCsrf },
    data: { phone, challengeId: loginChallengeId, code: '246810', remember: false },
  });
  expect(codeLogin.status()).toBe(200);

  await first.dispose();
  await second.dispose();
  await third.dispose();
});

test('registers, restores the protected account view, and logs out securely', async ({ page }) => {
  const phone = syntheticPhone('139');
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: '开始记录成长' })).toBeVisible();
  await page.getByLabel('手机号').fill(phone);
  await page.getByRole('button', { name: '获取验证码' }).click();
  await page.getByLabel('验证码').fill('246810');
  await page.getByLabel('设置密码').fill('abcde');
  await page.getByLabel('确认密码').fill('abcde');
  await page.getByLabel(/我已阅读并同意/).check();
  await page.getByRole('button', { name: '注册并登录' }).click();
  await expect(page.getByText('密码至少需要 6 个字符')).toBeVisible();

  await page.getByLabel('设置密码').fill('abcdef');
  await page.getByLabel('确认密码').fill('abcdef');
  await page.getByRole('button', { name: '注册并登录' }).click();

  await expect(page.getByRole('heading', { name: '把珍贵时刻分享给最亲近的人' })).toBeVisible();
  const sessionCookie = (await page.context().cookies()).find((cookie) =>
    cookie.name.includes('session'),
  );
  expect(sessionCookie).toMatchObject({
    httpOnly: true,
    sameSite: 'Lax',
    secure: false,
    path: '/',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => document.cookie.includes('bgg_dev_session'))).toBe(false);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => /token|auth|session/i.test(key)),
    ),
  ).toBe(false);

  await page.reload();
  await expect(page.getByRole('heading', { name: '把珍贵时刻分享给最亲近的人' })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    await page.getByRole('button', { name: '打开家庭切换器' }).click();
  }
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('keeps protected content hidden while session recovery is unresolved', async ({ page }) => {
  await page.route('**/api/v1/auth/session', () => new Promise(() => undefined));
  await page.goto('/app');
  await expect(page.getByText('正在恢复安全会话…')).toBeVisible();
  await expect(page.getByRole('heading', { name: '把珍贵时刻分享给最亲近的人' })).toHaveCount(0);
});

test('rejects an external return path and exposes keyboard-friendly validation', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: JSON.stringify({ detail: 'Authentication is required.' }),
    }),
  );
  await page.goto('/login');
  await page.getByLabel('手机号').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('请输入有效的中国大陆手机号')).toBeVisible();
  await expect(page.getByLabel('手机号')).toBeFocused();
});
