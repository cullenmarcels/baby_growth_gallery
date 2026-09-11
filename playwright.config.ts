import { defineConfig, devices } from '@playwright/test';

const stackBaseUrl = process.env.STACK_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: stackBaseUrl ?? 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: stackBaseUrl
    ? []
    : [
        {
          command: 'pnpm dev:api',
          url: 'http://127.0.0.1:3000/api/v1/health/live',
          env: {
            NODE_ENV: 'test',
            WEB_ORIGIN: 'http://127.0.0.1:5173',
            DATABASE_URL:
              process.env.DATABASE_URL ??
              'postgresql://baby_gallery:baby_gallery_dev_password@127.0.0.1:5432/baby_growth_gallery',
            REDIS_URL: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
            REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX ?? 'bgg-e2e',
            VERIFICATION_DELIVERY_MODE: 'fixed',
            TEST_VERIFICATION_CODE: '246810',
            AUTH_SESSION_SECRET: 'e2e-session-secret-that-is-not-for-production',
            AUTH_HMAC_SECRET: 'e2e-hmac-secret-that-is-not-for-production-use',
          },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: 'pnpm dev:web',
          url: 'http://127.0.0.1:5173',
          env: { VITE_API_BASE_URL: 'http://127.0.0.1:3000' },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
  projects: [
    {
      name: 'chromium-375',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
    {
      name: 'chromium-834',
      use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1112 } },
    },
    {
      name: 'chromium-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
});
