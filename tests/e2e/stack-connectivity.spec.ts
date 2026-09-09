import { expect, test } from '@playwright/test';

test('deployed Web reaches the independent API readiness endpoint', async ({ page }) => {
  test.skip(!process.env.STACK_BASE_URL, 'Only runs against an explicitly started container stack');

  const readyResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/health/ready') && response.request().method() === 'GET',
  );

  await page.goto('/');
  const response = await readyResponse;

  expect(response.ok()).toBe(true);
  await expect(page.getByText('前后端连接正常')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});
