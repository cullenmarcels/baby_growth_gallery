import { expect, test } from '@playwright/test';

test('deployed Web reaches the independent API readiness endpoint', async ({ page }) => {
  test.skip(!process.env.STACK_BASE_URL, 'Only runs against an explicitly started container stack');

  const apiBaseUrl = process.env.E2E_API_BASE_URL;
  expect(apiBaseUrl).toBeTruthy();

  await page.goto('/');
  const response = await page.evaluate(async (baseUrl) => {
    const result = await fetch(`${baseUrl}/api/v1/health/ready`, { credentials: 'include' });
    return { ok: result.ok, body: await result.json() };
  }, apiBaseUrl);

  expect(response.ok).toBe(true);
  expect(response.body).toMatchObject({
    status: 'ok',
    dependencies: { postgres: 'up', redis: 'up', objectStorage: 'up' },
  });
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});
