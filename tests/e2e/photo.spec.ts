import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
} from '@playwright/test';
import { randomInt, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const apiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000';
const webOrigin = process.env.STACK_BASE_URL ?? 'http://127.0.0.1:5173';
const syntheticPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function syntheticPhone(): string {
  return `136${randomInt(10_000_000, 100_000_000)}`;
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
      'X-Forwarded-For': `198.20.${randomInt(0, 256)}.${randomInt(1, 255)}`,
    },
  });
  const phone = syntheticPhone();
  const firstCsrf = await csrf(context);
  const challenge = await context.post('/api/v1/auth/verification-challenges', {
    headers: { Origin: webOrigin, 'x-csrf-token': firstCsrf },
    data: { phone, purpose: 'REGISTER' },
  });
  expect(challenge.status()).toBe(202);
  const challengeId = ((await challenge.json()) as { challengeId: string }).challengeId;
  const registration = await context.post('/api/v1/auth/register', {
    headers: { Origin: webOrigin, 'x-csrf-token': firstCsrf },
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

test('uploads to private storage, isolates drafts, publishes an activity, and restores trash', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(
    testInfo.project.name !== 'chromium-1440',
    'API and storage contract is viewport-independent',
  );
  const owner = await registerAccount();
  const member = await registerAccount();
  const spectator = await registerAccount();
  const familyResponse = await post(owner.context, '/api/v1/families', owner.csrf, {
    name: '合成照片家庭',
    displayName: '合成创建者',
  });
  expect(familyResponse.status()).toBe(201);
  const familyId = ((await familyResponse.json()) as { id: string }).id;
  const babyResponse = await post(
    owner.context,
    `/api/v1/families/${familyId}/babies`,
    owner.csrf,
    { nickname: '合成宝宝', birthDate: '2026-01-02', sex: null },
  );
  expect(babyResponse.status()).toBe(201);
  const babyId = ((await babyResponse.json()) as { id: string }).id;
  const syntheticHeic = await readFile(
    path.resolve(process.cwd(), 'apps/api/test/fixtures/synthetic-grid.heic'),
  );

  const invitation = await post(
    owner.context,
    `/api/v1/families/${familyId}/invitations`,
    owner.csrf,
  );
  const invitationToken = ((await invitation.json()) as { token: string }).token;
  expect(
    (
      await post(member.context, '/api/v1/family-invitations/accept', member.csrf, {
        token: invitationToken,
        displayName: '合成成员',
      })
    ).status(),
  ).toBe(200);
  const spectatorInvitation = await post(
    owner.context,
    `/api/v1/families/${familyId}/invitations`,
    owner.csrf,
  );
  expect(spectatorInvitation.status()).toBe(201);
  expect(
    (
      await post(spectator.context, '/api/v1/family-invitations/accept', spectator.csrf, {
        token: ((await spectatorInvitation.json()) as { token: string }).token,
        displayName: '合成旁观成员',
      })
    ).status(),
  ).toBe(200);

  const createBatch = await post(
    member.context,
    `/api/v1/families/${familyId}/babies/${babyId}/photo-upload-batches`,
    member.csrf,
    {
      files: [
        { contentType: 'image/png', sizeBytes: syntheticPng.length, capturedOn: '2026-01-02' },
        {
          contentType: 'image/heic',
          sizeBytes: syntheticHeic.length,
          capturedOn: '2026-01-02',
        },
      ],
    },
  );
  expect(createBatch.status()).toBe(201);
  const batch = (await createBatch.json()) as {
    id: string;
    photos: Array<{ id: string; status: string }>;
    uploadInstructions: Array<{
      photoId: string;
      url: string;
      fields: Record<string, string>;
    }>;
  };
  const photoId = batch.photos[0]!.id;
  const heicPhotoId = batch.photos[1]!.id;
  const storage = await playwrightRequest.newContext();
  const tamperedUpload = await storage.post(batch.uploadInstructions[0]!.url, {
    multipart: {
      ...batch.uploadInstructions[0]!.fields,
      key: `quarantine/${randomUUID()}`,
      file: { name: 'synthetic.png', mimeType: 'image/png', buffer: syntheticPng },
    },
  });
  expect(tamperedUpload.status()).toBe(403);
  for (const [index, source] of [
    { name: 'synthetic.png', mimeType: 'image/png', buffer: syntheticPng },
    { name: 'synthetic.heic', mimeType: 'image/heic', buffer: syntheticHeic },
  ].entries()) {
    const instruction = batch.uploadInstructions[index]!;
    const uploaded = await storage.post(instruction.url, {
      multipart: { ...instruction.fields, file: source },
    });
    expect(uploaded.ok()).toBe(true);
    const completed = await post(
      member.context,
      `/api/v1/families/${familyId}/babies/${babyId}/photo-upload-batches/${batch.id}/photos/${instruction.photoId}/complete`,
      member.csrf,
    );
    expect(completed.status()).toBe(202);
  }

  await expect
    .poll(
      async () => {
        const response = await member.context.get(
          `/api/v1/families/${familyId}/babies/${babyId}/photo-upload-batches/${batch.id}`,
        );
        return ((await response.json()) as { photos: Array<{ status: string }> }).photos
          .map((photo) => photo.status)
          .join(',');
      },
      { timeout: 30_000 },
    )
    .toBe('DRAFT,DRAFT');
  const processedBatch = await member.context.get(
    `/api/v1/families/${familyId}/babies/${babyId}/photo-upload-batches/${batch.id}`,
  );
  expect(
    (
      (await processedBatch.json()) as {
        photos: Array<{ sourceFormat: string }>;
      }
    ).photos.map((photo) => photo.sourceFormat),
  ).toEqual(['PNG', 'HEIC']);

  const hiddenDraft = await owner.context.get(
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}/preview?variant=THUMBNAIL`,
  );
  expect(hiddenDraft.status()).toBe(404);
  expect(((await hiddenDraft.json()) as { code: string }).code).toBe('PHOTO_NOT_FOUND');
  expect(
    (
      await owner.context.get(
        `/api/v1/families/${familyId}/babies/${babyId}/photo-upload-batches/${batch.id}`,
      )
    ).status(),
  ).toBe(404);
  const familyManage = await owner.context.get(
    `/api/v1/families/${familyId}/babies/${babyId}/photos/manage?scope=family`,
  );
  expect(familyManage.status()).toBe(200);
  expect(
    ((await familyManage.json()) as { items: Array<{ id: string }> }).items.some(
      (item) => item.id === photoId || item.id === heicPhotoId,
    ),
  ).toBe(false);

  const preview = await member.context.get(
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}/preview?variant=THUMBNAIL`,
  );
  expect(preview.status()).toBe(200);
  const previewUrl = ((await preview.json()) as { url: string }).url;
  const previewObject = await storage.get(previewUrl);
  expect(previewObject.status()).toBe(200);
  expect((await previewObject.body()).subarray(0, 4).toString('ascii')).toBe('RIFF');

  const updated = await member.context.patch(
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}`,
    {
      headers: { Origin: webOrigin, 'x-csrf-token': member.csrf },
      data: { title: '合成色块', location: '合成地点', capturedOn: '2026-01-02' },
    },
  );
  expect(updated.status()).toBe(200);
  const published = await post(
    member.context,
    `/api/v1/families/${familyId}/babies/${babyId}/photo-upload-batches/${batch.id}/publish`,
    member.csrf,
    { photoIds: [photoId, heicPhotoId] },
  );
  expect(published.status()).toBe(200);
  expect(
    ((await published.json()) as { items: Array<{ status: string }> }).items.map(
      (photo) => photo.status,
    ),
  ).toEqual(['PUBLISHED', 'PUBLISHED']);
  expect(
    (
      await owner.context.get(
        `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}/preview?variant=DISPLAY`,
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await spectator.context.get(
        `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}/preview?variant=DISPLAY`,
      )
    ).status(),
  ).toBe(200);
  const deniedTrash = await post(
    spectator.context,
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}/trash`,
    spectator.csrf,
  );
  expect(deniedTrash.status()).toBe(403);
  expect(((await deniedTrash.json()) as { code: string }).code).toBe('PHOTO_PERMISSION_DENIED');
  const activityResponse = await owner.context.get(`/api/v1/families/${familyId}/activities`);
  const activities = (await activityResponse.json()) as {
    items: Array<{ type: string; subject?: { id: string }; summary?: Record<string, unknown> }>;
  };
  expect(activities.items).toContainEqual(
    expect.objectContaining({
      type: 'PHOTO_UPLOADED',
      subject: { type: 'PHOTO', id: photoId },
      summary: { babyId },
    }),
  );

  const trashed = await post(
    owner.context,
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}/trash`,
    owner.csrf,
  );
  expect(((await trashed.json()) as { status: string }).status).toBe('TRASHED');
  const restored = await post(
    owner.context,
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}/restore`,
    owner.csrf,
  );
  expect(((await restored.json()) as { status: string }).status).toBe('PUBLISHED');

  await storage.dispose();
  await owner.context.dispose();
  await member.context.dispose();
  await spectator.context.dispose();
});

test('uploads and publishes a synthetic photo in the responsive flow', async ({
  page,
}, testInfo) => {
  await page.goto('/register');
  await page.getByLabel('手机号').fill(syntheticPhone());
  await page.getByRole('button', { name: '获取验证码' }).click();
  await page.getByLabel('验证码').fill('246810');
  await page.getByLabel('设置密码').fill('abcdef');
  await page.getByLabel('确认密码').fill('abcdef');
  await page.getByLabel(/我已阅读并同意/).check();
  await page.getByRole('button', { name: '注册并登录' }).click();
  await page.getByLabel('家庭名称').fill('响应式照片家庭');
  await page.getByLabel('你在家庭中的称呼').fill('合成创建者');
  await page.getByRole('button', { name: '创建家庭', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/families\//);
  await page.goto('/app/babies/new');
  await page.getByLabel('宝宝昵称').fill('合成宝宝');
  await page.getByLabel('出生日期').fill('2026-01-02');
  await page.getByRole('button', { name: '创建宝宝档案' }).click();
  await expect(page.getByRole('heading', { name: '合成宝宝' })).toBeVisible();
  await page.goto('/app/photos/upload');
  await expect(page.getByRole('heading', { name: '把珍贵瞬间放进家庭记忆' })).toBeVisible();
  const heic = testInfo.project.name === 'chromium-1440';
  await page.locator('input[type="file"][multiple]').setInputFiles(
    heic
      ? {
          name: 'synthetic-grid.heic',
          mimeType: 'image/heic',
          buffer: await readFile(
            path.resolve(process.cwd(), 'apps/api/test/fixtures/synthetic-grid.heic'),
          ),
        }
      : { name: 'synthetic.png', mimeType: 'image/png', buffer: syntheticPng },
  );
  await page.getByRole('button', { name: '开始上传' }).click();
  await expect(page.getByText('私有草稿已就绪')).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/app\/photos\/upload\?batchId=/);
  await page.reload();
  await expect(page.getByText('私有草稿已就绪')).toBeVisible();
  await expect(page.getByRole('img', { name: '所选照片 1' })).toBeVisible();
  await page.getByRole('link', { name: '我的上传' }).click();
  await page.getByRole('link', { name: '查看上传批次' }).click();
  await expect(page.getByText('私有草稿已就绪')).toBeVisible();
  await page.getByLabel('发布').check();
  await page.getByLabel('地点', { exact: true }).fill('批量合成地点');
  await page.getByRole('button', { name: '套用到所选' }).click();
  await expect(page.getByText('已为 1 张草稿批量套用信息。')).toBeVisible();
  await expect(page.getByLabel('地点（选填）')).toHaveValue('批量合成地点');
  await page.getByLabel('地点（选填）').fill('合成地点');
  await page.getByRole('button', { name: '保存信息' }).click();
  await expect(page.getByText('照片信息已保存。')).toBeVisible();
  await page.getByRole('button', { name: '发布所选' }).click();
  await expect(page.getByText('所选照片已发布给家庭成员。')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: '我的上传' }).click();
  await expect(page.getByRole('article').getByText('已发布', { exact: true })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    await expect(page.getByRole('navigation', { name: '移动端主导航' })).toBeVisible();
  } else {
    await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
  }
});
