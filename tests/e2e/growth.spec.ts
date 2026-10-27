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
  return `134${randomInt(10_000_000, 100_000_000)}`;
}

function localToday(): string {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
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
      'X-Forwarded-For': `198.23.${randomInt(0, 256)}.${randomInt(1, 255)}`,
    },
  });
  const phone = syntheticPhone();
  const token = await csrf(context);
  const challenge = await context.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin, 'x-csrf-token': token },
    data: { phone, purpose: 'REGISTER' },
  });
  expect(challenge.status()).toBe(202);
  const challengeId = ((await challenge.json()) as { challengeId: string }).challengeId;
  const registration = await context.post('/api/v1/auth/register', {
    headers: { Origin: webOrigin, 'x-csrf-token': token },
    data: {
      phone,
      challengeId,
      code: '246810',
      password: 'abcdef',
      termsVersion: 'draft-2026-09-10',
      privacyVersion: 'draft-2026-09-10',
    },
  });
  expect(registration.status()).toBe(201);
  return { context, csrf: await csrf(context) };
}

async function post(context: APIRequestContext, path: string, token: string, data?: unknown) {
  return context.post(path, {
    headers: { Origin: webOrigin, 'x-csrf-token': token },
    ...(data === undefined ? {} : { data }),
  });
}

async function joinFamily(
  owner: { context: APIRequestContext; csrf: string },
  member: { context: APIRequestContext; csrf: string },
  familyId: string,
  displayName: string,
): Promise<void> {
  const invitation = await post(
    owner.context,
    `/api/v1/families/${familyId}/invitations`,
    owner.csrf,
  );
  const token = ((await invitation.json()) as { token: string }).token;
  expect(
    (
      await post(member.context, '/api/v1/family-invitations/accept', member.csrf, {
        token,
        displayName,
      })
    ).status(),
  ).toBe(200);
}

async function setupGrowth() {
  const owner = await registerAccount();
  const created = await post(owner.context, '/api/v1/families', owner.csrf, {
    name: '合成成长家庭',
    displayName: '成长家长',
  });
  expect(created.status()).toBe(201);
  const familyId = ((await created.json()) as { id: string }).id;
  const birthDate = new Date(Date.now() - 366 * 86400000).toISOString().slice(0, 10);
  const babyResponse = await post(
    owner.context,
    `/api/v1/families/${familyId}/babies`,
    owner.csrf,
    { nickname: '合成成长宝宝', birthDate, sex: 'FEMALE' },
  );
  expect(babyResponse.status()).toBe(201);
  const babyId = ((await babyResponse.json()) as { id: string }).id;
  const base = `/api/v1/families/${familyId}/babies/${babyId}/growth-records`;
  return { owner, familyId, babyId, base };
}
const headers = (token: string) => ({ Origin: webOrigin, 'x-csrf-token': token });
type RecordRow = {
  id: string;
  version: number;
  status: string;
  canRestore: boolean;
  dateConflict: boolean;
  measurements: Array<{
    metric: string;
    reference: { reason: string | null; zScore: number | null };
  }>;
};

test('growth UI supports partial entry, real curves, recycle, recovery and administrator permanent deletion', async ({
  page,
}, testInfo) => {
  const { owner, familyId, babyId, base } = await setupGrowth();
  try {
    expect(
      (
        await post(
          owner.context,
          `/api/v1/families/${familyId}/babies/${babyId}/activate`,
          owner.csrf,
        )
      ).status(),
    ).toBe(200);
    const state = await owner.context.storageState();
    await page.context().addCookies(state.cookies);
    await page.goto('/app/growth');
    await expect(page.getByRole('heading', { name: '成长数据', exact: true })).toBeVisible();
    await page.getByRole('link', { name: '添加记录' }).click();
    await page.getByLabel('体重（kg）').fill('9.21');
    await page.getByLabel('备注').fill('合成测量一');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.getByText('合成测量一')).toBeVisible();
    await page.getByRole('combobox', { name: '指标', exact: true }).selectOption('WEIGHT');
    await expect(page.getByRole('img', { name: /体重曲线/ })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('growth-normal.png'), fullPage: true });
    const bounds = await page.getByRole('button', { name: '回收', exact: true }).boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: '回收', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '确认', exact: true }).click();
    await expect(page.getByText('记录已放入回收站。')).toBeVisible();
    await page.getByRole('button', { name: '回收站', exact: true }).click();
    await page.getByRole('button', { name: '恢复', exact: true }).click();
    await expect(page.getByText('记录已恢复。')).toBeVisible();
    await page.getByRole('button', { name: '测量记录' }).click();
    await page.getByRole('button', { name: '回收', exact: true }).click();
    await page.getByRole('button', { name: '确认', exact: true }).click();
    await expect(page.getByText('记录已放入回收站。')).toBeVisible();
    await page.getByRole('button', { name: '回收站', exact: true }).click();
    await page.getByRole('button', { name: '彻底删除', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('无法恢复');
    await page.getByRole('button', { name: '确认', exact: true }).click();
    await expect(page.getByText('记录已永久删除。')).toBeVisible();
    const result = await owner.context.get(`${base}?state=TRASHED`);
    expect(((await result.json()) as { items: unknown[] }).items).toHaveLength(0);
  } finally {
    await owner.context.dispose();
  }
});

test('growth authorization isolates families, authors and administrator recycle restrictions', async () => {
  const { owner, familyId, babyId, base } = await setupGrowth();
  const author = await registerAccount(),
    reader = await registerAccount(),
    outsider = await registerAccount();
  try {
    await joinFamily(owner, author, familyId, '合成记录者');
    await joinFamily(owner, reader, familyId, '合成观察者');
    const response = await post(author.context, base, author.csrf, {
      measuredOn: localToday(),
      weightKg: 9,
    });
    expect(response.status()).toBe(201);
    let row = (await response.json()) as RecordRow;
    expect((await outsider.context.get(base)).status()).toBe(404);
    expect(
      (
        await reader.context.patch(`${base}/${row.id}`, {
          headers: headers(reader.csrf),
          data: { expectedVersion: row.version, weightKg: 10 },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await post(reader.context, `${base}/${row.id}/trash`, reader.csrf, {
          expectedVersion: row.version,
        })
      ).status(),
    ).toBe(403);
    const trash = await post(owner.context, `${base}/${row.id}/trash`, owner.csrf, {
      expectedVersion: row.version,
    });
    expect(trash.status()).toBe(200);
    row = (await trash.json()) as RecordRow;
    expect((await author.context.get(`${base}/${row.id}`)).status()).toBe(200);
    expect(
      (
        await post(author.context, `${base}/${row.id}/restore`, author.csrf, {
          expectedVersion: row.version,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await author.context.delete(`${base}/${row.id}?expectedVersion=${row.version}`, {
          headers: headers(author.csrf),
        })
      ).status(),
    ).toBe(403);
    const readerTrash = await reader.context.get(`${base}?state=TRASHED`);
    expect(((await readerTrash.json()) as { items: unknown[] }).items).toHaveLength(0);
    expect((await reader.context.get(`${base}/${row.id}`)).status()).toBe(404);
    const restored = await post(owner.context, `${base}/${row.id}/restore`, owner.csrf, {
      expectedVersion: row.version,
    });
    expect(restored.status()).toBe(200);
    const restoredRow = (await restored.json()) as RecordRow;
    expect(
      (
        await post(author.context, `${base}/${row.id}/trash`, author.csrf, {
          expectedVersion: restoredRow.version,
        })
      ).status(),
    ).toBe(200);
    const current = await author.context.get(`${base}/${row.id}`);
    const ownTrash = (await current.json()) as RecordRow;
    expect(ownTrash.canRestore).toBe(true);
    expect(
      (
        await post(author.context, `${base}/${row.id}/restore`, author.csrf, {
          expectedVersion: ownTrash.version,
        })
      ).status(),
    ).toBe(200);
    const otherBaby = await post(owner.context, `/api/v1/families/${familyId}/babies`, owner.csrf, {
      nickname: '合成另一个宝宝',
      birthDate: localToday(),
    });
    const otherId = ((await otherBaby.json()) as { id: string }).id;
    expect(
      (
        await owner.context.get(
          `/api/v1/families/${familyId}/babies/${otherId}/growth-records/${row.id}`,
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await post(
          owner.context,
          `/api/v1/families/${familyId}/babies/${babyId}/archive`,
          owner.csrf,
        )
      ).status(),
    ).toBe(200);
    expect((await author.context.get(base)).status()).toBe(404);
    expect(
      (
        await post(author.context, base, author.csrf, { measuredOn: localToday(), headCm: 42 })
      ).status(),
    ).toBe(404);
    expect(
      (
        await post(
          owner.context,
          `/api/v1/families/${familyId}/babies/${babyId}/restore`,
          owner.csrf,
        )
      ).status(),
    ).toBe(200);
    expect((await author.context.get(base)).status()).toBe(200);
  } finally {
    await Promise.all([
      owner.context.dispose(),
      author.context.dispose(),
      reader.context.dispose(),
      outsider.context.dispose(),
    ]);
  }
});

test('growth same-day pagination, same-record BMI, optimistic concurrency and revised birthdays', async () => {
  const { owner, familyId, babyId, base } = await setupGrowth();
  try {
    const values = [
      { weightKg: 9.12 },
      { lengthCm: 75, measurementPosition: 'RECUMBENT' },
      { headCm: 43 },
    ];
    const ids: string[] = [];
    for (const measurement of values) {
      const r = await post(owner.context, base, owner.csrf, {
        measuredOn: localToday(),
        ...measurement,
      });
      expect(r.status()).toBe(201);
      ids.push(((await r.json()) as { id: string }).id);
    }
    const overview = await owner.context.get(`${base}/overview`);
    const latest = ((await overview.json()) as { latest: Array<{ metric: string }> }).latest;
    expect(latest.map((x) => x.metric).sort()).toEqual(['HEAD', 'LENGTH', 'WEIGHT']);
    let cursor = '';
    const seen: string[] = [];
    do {
      const r = await owner.context.get(`${base}?limit=1${cursor ? `&cursor=${cursor}` : ''}`);
      expect(r.status()).toBe(200);
      const p = (await r.json()) as { items: RecordRow[]; nextCursor: string | null };
      seen.push(...p.items.map((x) => x.id));
      cursor = p.nextCursor ?? '';
    } while (cursor);
    expect(seen).toHaveLength(3);
    expect(new Set(seen).size).toBe(3);
    const first = await owner.context.get(`${base}/${ids[0]}`);
    const row = (await first.json()) as RecordRow;
    const results = await Promise.all([
      owner.context.patch(`${base}/${row.id}`, {
        headers: headers(owner.csrf),
        data: { expectedVersion: row.version, weightKg: 9.2 },
      }),
      owner.context.patch(`${base}/${row.id}`, {
        headers: headers(owner.csrf),
        data: { expectedVersion: row.version, weightKg: 9.3 },
      }),
    ]);
    expect(results.map((x) => x.status()).sort()).toEqual([200, 409]);
    const oldDate = new Date(Date.now() - 100 * 86400000).toISOString().slice(0, 10);
    const historical = await post(owner.context, base, owner.csrf, {
      measuredOn: oldDate,
      weightKg: 8,
    });
    expect(historical.status()).toBe(201);
    let historic = (await historical.json()) as RecordRow;
    const changed = await owner.context.patch(`/api/v1/families/${familyId}/babies/${babyId}`, {
      headers: headers(owner.csrf),
      data: { birthDate: localToday(), sex: null },
    });
    expect(changed.status()).toBe(200);
    const after = await owner.context.get(`${base}/${historic.id}`);
    historic = (await after.json()) as RecordRow;
    expect(historic.dateConflict).toBe(true);
    expect(historic.measurements.find((x) => x.metric === 'WEIGHT')!.reference.reason).toBe(
      'DATE_CONFLICT',
    );
    const trashed = await post(owner.context, `${base}/${historic.id}/trash`, owner.csrf, {
      expectedVersion: historic.version,
    });
    historic = (await trashed.json()) as RecordRow;
    expect(
      (
        await post(owner.context, `${base}/${historic.id}/restore`, owner.csrf, {
          expectedVersion: historic.version,
        })
      ).status(),
    ).toBe(400);
    const restored = await post(owner.context, `${base}/${historic.id}/restore`, owner.csrf, {
      expectedVersion: historic.version,
      measuredOn: localToday(),
    });
    expect(restored.status()).toBe(200);
    expect(
      (
        await owner.context.patch(`${base}/${ids[2]}`, {
          headers: headers(owner.csrf),
          data: { expectedVersion: 1, headCm: 43.11 },
        })
      ).status(),
    ).toBe(400);
  } finally {
    await owner.context.dispose();
  }
});
