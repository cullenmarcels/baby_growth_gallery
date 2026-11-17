import { randomBytes, randomInt } from 'node:crypto';
import { expect, request, type APIRequestContext, type Page } from '@playwright/test';

export const apiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';
export const webOrigin = process.env.STACK_BASE_URL ?? 'http://127.0.0.1:5173';

export function syntheticUsername(): string {
  return `合成-${randomBytes(8).toString('hex')}`;
}

export async function csrf(context: APIRequestContext): Promise<string> {
  const response = await context.get('/api/v1/auth/csrf');
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

export function post(context: APIRequestContext, url: string, token: string, data?: unknown) {
  return context.post(url, {
    headers: { Origin: webOrigin, 'x-csrf-token': token },
    ...(data === undefined ? {} : { data }),
  });
}

export function accountContext() {
  return request.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: { 'X-Forwarded-For': `198.18.${randomInt(0, 256)}.${randomInt(1, 255)}` },
  });
}

export async function login(context: APIRequestContext, username: string, password: string) {
  const response = await post(context, '/api/v1/auth/login/password', await csrf(context), {
    username,
    password,
  });
  expect(response.status()).toBe(200);
  return response;
}

export async function adminContext() {
  return request.newContext({
    baseURL: apiBaseUrl,
    storageState: JSON.parse(process.env.BGG_E2E_ADMIN_STATE!) as Awaited<
      ReturnType<APIRequestContext['storageState']>
    >,
  });
}

export async function issueAccount(username = syntheticUsername()) {
  const admin = await adminContext();
  try {
    const result = await post(admin, '/api/v1/management/accounts', await csrf(admin), {
      username,
      displayName: username,
    });
    expect(result.status()).toBe(201);
    return (await result.json()) as { username: string; temporaryPassword: string };
  } finally {
    await admin.dispose();
  }
}

export async function provisionAccount() {
  const credential = await issueAccount();
  const password = randomBytes(16).toString('base64url');
  const context = await accountContext();
  await login(context, credential.username, credential.temporaryPassword);
  const changed = await post(context, '/api/v1/auth/password/change', await csrf(context), {
    currentPassword: credential.temporaryPassword,
    newPassword: password,
    acceptTerms: true,
  });
  expect(changed.status()).toBe(200);
  return { context, csrf: await csrf(context), username: credential.username, password };
}

export type TestAccount = Awaited<ReturnType<typeof provisionAccount>>;

export async function assignMember(
  familyId: string,
  username: string,
  displayName: string,
  role: 'ADMIN' | 'MEMBER' = 'MEMBER',
) {
  const admin = await adminContext();
  try {
    return (
      await post(admin, `/api/v1/management/families/${familyId}/members`, await csrf(admin), {
        username,
        displayName,
        role,
      })
    ).status();
  } finally {
    await admin.dispose();
  }
}

export async function createManagedFamily(owner: TestAccount, name: string, displayName: string) {
  const admin = await adminContext();
  try {
    const created = await post(admin, '/api/v1/management/families', await csrf(admin), { name });
    expect(created.status()).toBe(201);
    const family = (await created.json()) as { id: string; name: string };
    expect(await assignMember(family.id, owner.username, displayName, 'ADMIN')).toBe(204);
    const response = await post(
      owner.context,
      `/api/v1/families/${family.id}/activate`,
      owner.csrf,
    );
    expect(response.status()).toBe(200);
    return family;
  } finally {
    await admin.dispose();
  }
}

export async function changeMemberRole(
  familyId: string,
  membershipId: string,
  role: 'ADMIN' | 'MEMBER',
) {
  const admin = await adminContext();
  try {
    const response = await admin.patch(
      `/api/v1/management/families/${familyId}/members/${membershipId}`,
      {
        headers: { Origin: webOrigin, 'x-csrf-token': await csrf(admin) },
        data: { role },
      },
    );
    return response.status();
  } finally {
    await admin.dispose();
  }
}

export async function loginInBrowser(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('账户名').fill(username);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
}
