import { expect, test } from '@playwright/test';

test.skip(
  process.platform !== 'win32',
  'Visual baselines are fixed to the required Windows and Chromium candidate matrix.',
);

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: JSON.stringify({ detail: 'Authentication is required.' }),
    }),
  );
});

test('matches the responsive login baseline without horizontal overflow', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '登录家庭成长空间' })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expect(page).toHaveScreenshot('auth-login.png', {
    animations: 'disabled',
    fullPage: true,
  });
});

test('renders the registration agreement and password controls', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: '开始记录成长' })).toBeVisible();
  await expect(page.getByRole('link', { name: '用户协议' })).toBeVisible();
  await expect(page.getByRole('button', { name: '显示密码' })).toHaveCount(2);
  await expect(page).toHaveScreenshot('auth-register.png', {
    animations: 'disabled',
    fullPage: true,
  });
});
