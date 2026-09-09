import { expect, test } from '@playwright/test';

const readyResponse = {
  status: 'ok',
  service: 'baby-growth-gallery-api',
  version: '0.1.0',
  timestamp: '2026-09-08T00:00:00.000Z',
  dependencies: { postgres: 'up', redis: 'up', objectStorage: 'up' },
};

test('renders readiness and never overflows horizontally', async ({ page }) => {
  await page.route('**/api/v1/health/ready', (route) => route.fulfill({ json: readyResponse }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '前后端连接正常' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await expect(page).toHaveScreenshot('status-success.png', {
    animations: 'disabled',
    fullPage: true,
  });
});

test('renders a recoverable error state', async ({ page }) => {
  await page.route('**/api/v1/health/ready', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/problem+json',
      body: JSON.stringify({ detail: 'Dependencies unavailable: postgres' }),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '服务暂不可用' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重新连接' })).toBeVisible();
  await expect(page).toHaveScreenshot('status-error.png', {
    animations: 'disabled',
    fullPage: true,
  });
});

test('renders the loading state', async ({ page }) => {
  await page.route('**/api/v1/health/ready', () => new Promise(() => undefined));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '正在连接服务' })).toBeVisible();
  await expect(page).toHaveScreenshot('status-loading.png', {
    animations: 'disabled',
    fullPage: true,
  });
});
