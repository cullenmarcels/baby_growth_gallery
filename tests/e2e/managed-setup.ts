import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { request } from '@playwright/test';
import { apiBaseUrl, csrf, login, webOrigin } from './managed-fixtures';

export default async function managedSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Set E2E_DATABASE_URL to an isolated bgg_e2e_* database.');
  const password = randomBytes(24).toString('base64url');
  const api = path.resolve('apps/api');
  execFileSync(
    process.execPath,
    [
      path.join(api, 'node_modules/tsx/dist/cli.mjs'),
      path.join(api, 'test/fixtures/seed-managed-e2e.test.ts'),
    ],
    {
      cwd: api,
      env: { ...process.env, E2E_DATABASE_URL: databaseUrl, BGG_E2E_ADMIN_PASSWORD: password },
      stdio: 'inherit',
    },
  );
  const context = await request.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: { Origin: webOrigin },
  });
  try {
    await login(context, 'synthetic-e2e-admin', password);
    await csrf(context);
    process.env.BGG_E2E_ADMIN_PASSWORD = password;
    process.env.BGG_E2E_ADMIN_STATE = JSON.stringify(await context.storageState());
  } finally {
    await context.dispose();
  }
}
