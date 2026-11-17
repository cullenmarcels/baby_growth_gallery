import { expect, test } from '@playwright/test';

test.skip(process.platform !== 'win32', 'Visual baselines are fixed to Windows Chromium.');

test('matches the responsive username login baseline', async ({ page }) => {
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: JSON.stringify({ detail: 'Authentication is required.' }),
    }),
  );
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '登录家庭成长空间' })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expect(page).toHaveScreenshot('auth-login.png', { animations: 'disabled', fullPage: true });
});

test('renders the first-login agreement and password controls', async ({ page }) => {
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      json: {
        id: 'fixture',
        username: 'fixture',
        siteRole: 'USER',
        displayName: null,
        activeFamilyId: null,
        activeBabyId: null,
        mustChangePassword: true,
        mustAcceptTerms: true,
      },
    }),
  );
  await page.goto('/change-password');
  await expect(page.getByRole('heading', { name: '修改密码' })).toBeVisible();
  await expect(page.getByRole('link', { name: '用户协议' })).toBeVisible();
  await expect(page.getByRole('button', { name: '显示密码' })).toHaveCount(2);
  const saveButton = page.getByRole('button', { name: '保存密码' });
  const logoutButton = page.getByRole('button', { name: '退出登录' });
  await expect(saveButton).toBeVisible();
  await expect(logoutButton).toBeVisible();
  const saveBox = (await saveButton.boundingBox())!;
  const logoutBox = (await logoutButton.boundingBox())!;
  expect(logoutBox.y - (saveBox.y + saveBox.height)).toBeGreaterThanOrEqual(12);
  await expect(page).toHaveScreenshot('auth-change-password.png', {
    animations: 'disabled',
    fullPage: true,
  });
});
