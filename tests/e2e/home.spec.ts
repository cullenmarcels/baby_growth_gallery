import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
} from '@playwright/test';
import { randomInt } from 'node:crypto';

const apiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';
const webOrigin = process.env.STACK_BASE_URL ?? 'http://127.0.0.1:5173';

function syntheticPhone(): string {
  return `137${randomInt(10_000_000, 100_000_000)}`;
}

function shanghaiToday(): string {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

function shanghaiTomorrow(): string {
  return new Date(Date.now() + 8 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
}

async function csrf(context: APIRequestContext): Promise<string> {
  const response = await context.get('/api/v1/auth/csrf');
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

async function registerAccount(): Promise<{ context: APIRequestContext; csrf: string }> {
  const context = await playwrightRequest.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      'X-Forwarded-For': `198.24.${randomInt(0, 256)}.${randomInt(1, 255)}`,
    },
  });
  const phone = syntheticPhone();
  const token = await csrf(context);
  const challenge = await context.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin, 'x-csrf-token': token },
    data: { phone, purpose: 'REGISTER' },
  });
  expect(challenge.status()).toBe(202);
  const registration = await context.post('/api/v1/auth/register', {
    headers: { Origin: webOrigin, 'x-csrf-token': token },
    data: {
      phone,
      challengeId: ((await challenge.json()) as { challengeId: string }).challengeId,
      code: '246810',
      password: 'abcdef',
      termsVersion: 'draft-2026-09-10',
      privacyVersion: 'draft-2026-09-10',
    },
  });
  expect(registration.status()).toBe(201);
  return { context, csrf: await csrf(context) };
}

async function post(context: APIRequestContext, path: string, token: string, data: unknown) {
  return context.post(path, {
    headers: { Origin: webOrigin, 'x-csrf-token': token },
    data,
  });
}

async function createFamily(
  owner: { context: APIRequestContext; csrf: string },
  name: string,
  babyName: string,
  birthDate: string,
  weight: number,
): Promise<{ familyId: string; babyId: string }> {
  const familyResponse = await post(owner.context, '/api/v1/families', owner.csrf, {
    name,
    displayName: '合成创建者',
  });
  expect(familyResponse.status()).toBe(201);
  const familyId = ((await familyResponse.json()) as { id: string }).id;
  const babyResponse = await post(
    owner.context,
    `/api/v1/families/${familyId}/babies`,
    owner.csrf,
    { nickname: babyName, birthDate, sex: 'FEMALE' },
  );
  expect(babyResponse.status()).toBe(201);
  const babyId = ((await babyResponse.json()) as { id: string }).id;
  const base = `/api/v1/families/${familyId}/babies/${babyId}`;
  const measurement = await post(owner.context, `${base}/growth-records`, owner.csrf, {
    measuredOn: shanghaiToday(),
    weightKg: weight,
  });
  expect(measurement.status()).toBe(201);
  const milestone = await post(owner.context, `${base}/milestones`, owner.csrf, {
    source: 'CUSTOM',
    title: `${babyName}的近期记录`,
    reminderOn: shanghaiTomorrow(),
  });
  expect(milestone.status()).toBe(201);
  return { familyId, babyId };
}

test('home shows live summaries and keeps two family contexts separate', async ({ page }) => {
  const owner = await registerAccount();
  try {
    const first = await createFamily(owner, '合成家庭一', '合成宝宝一', '2024-01-01', 12.34);
    const second = await createFamily(owner, '合成家庭二', '合成宝宝二', '2025-01-01', 9.87);
    const session = (await owner.context
      .get('/api/v1/auth/session')
      .then((response) => response.json())) as { activeFamilyId: string; activeBabyId: string };
    expect(session.activeFamilyId).toBe(second.familyId);
    expect(session.activeBabyId).toBe(second.babyId);
    const activateFamily = await post(
      owner.context,
      `/api/v1/families/${first.familyId}/activate`,
      owner.csrf,
      {},
    );
    expect(activateFamily.status()).toBe(200);
    const activateBaby = await post(
      owner.context,
      `/api/v1/families/${first.familyId}/babies/${first.babyId}/activate`,
      owner.csrf,
      {},
    );
    expect(activateBaby.status()).toBe(200);
    await page.context().addCookies((await owner.context.storageState()).cookies);
    await page.goto('/app/home');
    await expect(page.getByRole('heading', { name: '合成宝宝一' })).toBeVisible();
    await expect(page.getByText('12.34 kg')).toBeVisible();
    await expect(page.getByText('合成宝宝一的近期记录')).toBeVisible();
    await expect(page.getByText('还没有已发布的家庭照片。')).toBeVisible();

    const viewportWidth = page.viewportSize()?.width ?? 1440;
    if (viewportWidth < 1024) {
      await page.getByRole('button', { name: '打开家庭切换器' }).click();
    } else {
      await page.getByRole('button', { name: '合成家庭一' }).click();
    }
    await page.getByRole('button', { name: '合成家庭二', exact: true }).click();
    await expect(page.getByRole('heading', { name: '合成宝宝二' })).toBeVisible();
    await expect(page.getByText('9.87 kg')).toBeVisible();
    await expect(page.getByText('合成宝宝二的近期记录')).toBeVisible();
    await expect(page.getByText('12.34 kg')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  } finally {
    await owner.context.dispose();
  }
});
