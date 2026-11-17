import { expect, test } from '@playwright/test';
import { createManagedFamily, post, provisionAccount, type TestAccount } from './managed-fixtures';

function shanghaiToday(): string {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

function shanghaiTomorrow(): string {
  return new Date(Date.now() + 8 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
}

async function createFamily(
  owner: TestAccount,
  name: string,
  babyName: string,
  birthDate: string,
  weight: number,
): Promise<{ familyId: string; babyId: string }> {
  const familyId = (await createManagedFamily(owner, name, '合成创建者')).id;
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
  const owner = await provisionAccount();
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
