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
  const hiddenGallery = await owner.context.get(
    `/api/v1/families/${familyId}/babies/${babyId}/photos/published`,
  );
  expect(hiddenGallery.status()).toBe(200);
  expect(((await hiddenGallery.json()) as { items: unknown[] }).items).toEqual([]);

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
  const galleryBase = `/api/v1/families/${familyId}/babies/${babyId}`;
  const firstGallery = await owner.context.get(`${galleryBase}/photos/published?limit=1`);
  expect(firstGallery.status()).toBe(200);
  const firstPage = (await firstGallery.json()) as {
    items: Array<{ id: string }>;
    nextCursor: string | null;
  };
  expect(firstPage.items).toHaveLength(1);
  expect(firstPage.nextCursor).toBeTruthy();
  const secondGallery = await owner.context.get(
    `${galleryBase}/photos/published?limit=1&cursor=${encodeURIComponent(firstPage.nextCursor!)}`,
  );
  expect(secondGallery.status()).toBe(200);
  const secondPage = (await secondGallery.json()) as { items: Array<{ id: string }> };
  expect(new Set([firstPage.items[0]!.id, secondPage.items[0]!.id])).toEqual(
    new Set([photoId, heicPhotoId]),
  );
  const timeline = await owner.context.get(`${galleryBase}/timeline`);
  expect(timeline.status()).toBe(200);
  expect(
    ((await timeline.json()) as { items: Array<{ kind: string; photo: { id: string } }> }).items,
  ).toEqual([
    expect.objectContaining({
      kind: 'PHOTO',
      photo: expect.objectContaining({ id: firstPage.items[0]!.id }),
    }),
    expect.objectContaining({
      kind: 'PHOTO',
      photo: expect.objectContaining({ id: secondPage.items[0]!.id }),
    }),
  ]);
  const detail = await owner.context.get(`${galleryBase}/photos/${firstPage.items[0]!.id}`);
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({
    canManage: true,
    previousPhotoId: null,
    nextPhotoId: secondPage.items[0]!.id,
  });
  const readerDetail = await spectator.context.get(`${galleryBase}/photos/${photoId}`);
  expect(readerDetail.status()).toBe(200);
  expect((await readerDetail.json()) as { canManage: boolean }).toMatchObject({ canManage: false });
  const changedDate = await member.context.patch(`${galleryBase}/photos/${photoId}`, {
    headers: { Origin: webOrigin, 'x-csrf-token': member.csrf },
    data: { capturedOn: '2026-01-01' },
  });
  expect(changedDate.status()).toBe(200);
  const reordered = await owner.context.get(`${galleryBase}/photos/published`);
  expect(
    ((await reordered.json()) as { items: Array<{ id: string }> }).items.map((item) => item.id),
  ).toEqual([heicPhotoId, photoId]);
  expect(
    (await (await owner.context.get(`${galleryBase}/photos/${photoId}`)).json()) as {
      previousPhotoId: string;
      nextPhotoId: null;
    },
  ).toMatchObject({
    previousPhotoId: heicPhotoId,
    nextPhotoId: null,
  });
  const otherBaby = await post(owner.context, `/api/v1/families/${familyId}/babies`, owner.csrf, {
    nickname: '另一个合成宝宝',
    birthDate: '2026-01-01',
    sex: null,
  });
  expect(otherBaby.status()).toBe(201);
  const otherBabyId = ((await otherBaby.json()) as { id: string }).id;
  expect(
    (
      (await (
        await owner.context.get(
          `/api/v1/families/${familyId}/babies/${otherBabyId}/photos/published`,
        )
      ).json()) as { items: unknown[] }
    ).items,
  ).toEqual([]);
  expect(
    (
      await owner.context.get(
        `/api/v1/families/${familyId}/babies/${otherBabyId}/photos/${photoId}`,
      )
    ).status(),
  ).toBe(404);
  const deniedAvatar = await spectator.context.patch(`${galleryBase}/avatar`, {
    headers: { Origin: webOrigin, 'x-csrf-token': spectator.csrf },
    data: { photoId },
  });
  expect(deniedAvatar.status()).toBe(403);
  const crossBabyAvatar = await owner.context.patch(
    `/api/v1/families/${familyId}/babies/${otherBabyId}/avatar`,
    {
      headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf },
      data: { photoId },
    },
  );
  expect(crossBabyAvatar.status()).toBe(404);
  const setAvatar = await owner.context.patch(`${galleryBase}/avatar`, {
    headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf },
    data: { photoId },
  });
  expect(setAvatar.status()).toBe(200);
  expect((await setAvatar.json()) as { avatarPhotoId: string }).toMatchObject({
    avatarPhotoId: photoId,
  });
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
  const members = await owner.context.get(`/api/v1/families/${familyId}/members`);
  expect(members.status()).toBe(200);
  const spectatorMembershipId = (
    (await members.json()) as { items: Array<{ id: string; displayName: string }> }
  ).items.find((item) => item.displayName === '合成旁观成员')?.id;
  expect(spectatorMembershipId).toBeTruthy();
  const promote = await owner.context.patch(
    `/api/v1/families/${familyId}/members/${spectatorMembershipId}/role`,
    { headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf }, data: { role: 'ADMIN' } },
  );
  expect(promote.status()).toBe(200);
  expect(
    (await (await spectator.context.get(`${galleryBase}/photos/${photoId}`)).json()) as {
      canManage: boolean;
    },
  ).toMatchObject({ canManage: true });
  const demote = await owner.context.patch(
    `/api/v1/families/${familyId}/members/${spectatorMembershipId}/role`,
    { headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf }, data: { role: 'MEMBER' } },
  );
  expect(demote.status()).toBe(200);
  expect(
    (await (await spectator.context.get(`${galleryBase}/photos/${photoId}`)).json()) as {
      canManage: boolean;
    },
  ).toMatchObject({ canManage: false });
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
  expect((await trashed.json()) as { status: string; canRestore: boolean }).toMatchObject({
    status: 'TRASHED',
    canRestore: true,
  });
  expect(
    (await (await owner.context.get(`/api/v1/families/${familyId}/babies/${babyId}`)).json()) as {
      avatarPhotoId: string | null;
    },
  ).toMatchObject({ avatarPhotoId: null });
  expect((await owner.context.get(`${galleryBase}/photos/${photoId}`)).status()).toBe(404);
  expect(
    (await (await owner.context.get(`${galleryBase}/photos/published`)).json()) as {
      items: Array<{ id: string }>;
    },
  ).toMatchObject({ items: [{ id: heicPhotoId }] });
  const memberTrashPage = await member.context.get(
    `/api/v1/families/${familyId}/babies/${babyId}/photos/manage?scope=mine&status=TRASHED`,
  );
  expect(memberTrashPage.status()).toBe(200);
  expect(
    ((await memberTrashPage.json()) as { items: Array<{ id: string; canRestore: boolean }> }).items,
  ).toContainEqual(expect.objectContaining({ id: photoId, canRestore: false }));
  const deniedRestore = await post(
    member.context,
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}/restore`,
    member.csrf,
  );
  expect(deniedRestore.status()).toBe(403);
  expect(((await deniedRestore.json()) as { code: string }).code).toBe(
    'PHOTO_RESTORE_ADMIN_REQUIRED',
  );
  const restored = await post(
    owner.context,
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${photoId}/restore`,
    owner.csrf,
  );
  expect(((await restored.json()) as { status: string }).status).toBe('PUBLISHED');
  expect(
    (await (await owner.context.get(`/api/v1/families/${familyId}/babies/${babyId}`)).json()) as {
      avatarPhotoId: string | null;
    },
  ).toMatchObject({ avatarPhotoId: null });
  const selfTrashed = await post(
    member.context,
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${heicPhotoId}/trash`,
    member.csrf,
  );
  expect((await selfTrashed.json()) as { status: string; canRestore: boolean }).toMatchObject({
    status: 'TRASHED',
    canRestore: true,
  });
  const selfRestored = await post(
    member.context,
    `/api/v1/families/${familyId}/babies/${babyId}/photos/${heicPhotoId}/restore`,
    member.csrf,
  );
  expect(((await selfRestored.json()) as { status: string }).status).toBe('PUBLISHED');

  const [avatarRace, trashRace] = await Promise.all([
    owner.context.patch(`${galleryBase}/avatar`, {
      headers: { Origin: webOrigin, 'x-csrf-token': owner.csrf },
      data: { photoId: heicPhotoId },
    }),
    post(
      member.context,
      `/api/v1/families/${familyId}/babies/${babyId}/photos/${heicPhotoId}/trash`,
      member.csrf,
    ),
  ]);
  expect([200, 409]).toContain(avatarRace.status());
  expect(trashRace.status()).toBe(200);
  expect(
    (await (await owner.context.get(`/api/v1/families/${familyId}/babies/${babyId}`)).json()) as {
      avatarPhotoId: string | null;
    },
  ).toMatchObject({ avatarPhotoId: null });

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
  const batchUrl = page.url();
  await expect(page.getByText('私有草稿已就绪')).toBeVisible();
  await expect(page.getByRole('img', { name: '所选照片 1' })).toBeVisible();
  const uploadCard = page.locator('main article').first();
  const cardPadding = await uploadCard.evaluate((card) => {
    const style = getComputedStyle(card);
    return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
  });
  expect(cardPadding).toEqual(['16px', '16px', '16px', '16px']);
  const metadata = page.getByRole('button', { name: '保存信息' }).locator('xpath=ancestor::form');
  const fields = await metadata.locator('label').evaluateAll((labels) =>
    labels.map((label) => {
      const bounds = label.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width };
    }),
  );
  expect(fields).toHaveLength(4);
  if ((page.viewportSize()?.width ?? 1440) > 640) {
    expect(fields[0]!.width).toBeGreaterThan(fields[1]!.width);
    expect(Math.abs(fields[1]!.y - fields[2]!.y)).toBeLessThanOrEqual(1);
  } else {
    expect(Math.abs(fields[0]!.width - fields[1]!.width)).toBeLessThanOrEqual(1);
    expect(fields[2]!.y).toBeGreaterThan(fields[1]!.y);
  }
  expect(fields[1]!.y).toBeGreaterThan(fields[0]!.y);
  const [headerButtonStyle, saveButtonStyle] = await Promise.all([
    page.getByRole('link', { name: '我的上传' }).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        padding: style.paddingLeft,
        background: style.backgroundColor,
      };
    }),
    page.getByRole('button', { name: '保存信息' }).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        padding: style.paddingLeft,
        background: style.backgroundColor,
      };
    }),
  ]);
  expect(headerButtonStyle).toEqual(saveButtonStyle);
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
  const statusFilter = page.getByRole('button', { name: '状态筛选' });
  await statusFilter.click();
  const statusMenu = page.getByRole('listbox', { name: '状态筛选' });
  await expect(statusMenu).toBeVisible();
  const menuBounds = await statusMenu.boundingBox();
  expect(menuBounds).not.toBeNull();
  expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
  expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath('status-dropdown.png') });
  await page.getByRole('option', { name: '已发布' }).click();
  await expect(statusFilter).toContainText('已发布');
  const managedNames = [
    '第一张横向照片',
    '第二张竖向照片与更长的标题',
    '第三张照片',
    '第四张竖向照片',
    '第五张有较长地点的照片',
    '第六张照片',
  ];
  const managedRatios = [
    [1600, 900],
    [600, 1200],
    [1200, 800],
    [700, 1000],
    [1000, 700],
    [900, 900],
  ];
  let managedItems: Array<Record<string, unknown>> = [];
  const manageApi = /\/api\/v1\/families\/[^/]+\/babies\/[^/]+\/photos\/manage(?:\?.*)?$/;
  const previewApi = /\/photos\/[^/]+\/preview\?variant=THUMBNAIL$/;
  await page.route(manageApi, async (route) => {
    if (managedItems.length === 0) {
      const response = await route.fetch();
      const data = (await response.json()) as { items: Array<Record<string, unknown>> };
      const source = data.items[0]!;
      managedItems = managedNames.map((title, index) => ({
        ...source,
        id: randomUUID(),
        title,
        width: managedRatios[index]![0],
        height: managedRatios[index]![1],
        location: index === 4 ? '一个很长的合成地点名称用于检查文字换行与卡片高度' : null,
        updatedAt: new Date(Date.now() - index * 1000).toISOString(),
      }));
    }
    const nextPage = new URL(route.request().url()).searchParams.has('cursor');
    await route.fulfill({
      status: 200,
      json: {
        items: nextPage ? managedItems.slice(4) : managedItems.slice(0, 4),
        nextCursor: nextPage ? null : 'synthetic-next',
      },
    });
  });
  await page.route(previewApi, (route) =>
    route.fulfill({
      status: 200,
      json: {
        url: `data:image/png;base64,${syntheticPng.toString('base64')}`,
        expiresAt: '2030-01-01T00:00:00.000Z',
      },
    }),
  );
  await page.goto('/app/photos/manage');
  const managedCards = page.getByRole('article');
  await expect(managedCards).toHaveCount(4);
  await page.getByRole('button', { name: '加载更多' }).click();
  await expect(managedCards).toHaveCount(managedNames.length);
  expect(await managedCards.locator('h2').allTextContents()).toEqual(managedNames);
  await expect
    .poll(() =>
      managedCards.first().evaluate((card) => card.parentElement?.parentElement?.style.gridRowEnd),
    )
    .toMatch(/^span \d+$/);
  const cardGeometry = await managedCards.evaluateAll((cards) =>
    cards.map((card) => {
      const bounds = card.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    }),
  );
  for (const [index, first] of cardGeometry.entries()) {
    for (const second of cardGeometry.slice(index + 1)) {
      const overlaps =
        first.x < second.x + second.width &&
        first.x + first.width > second.x &&
        first.y < second.y + second.height &&
        first.y + first.height > second.y;
      expect(overlaps).toBe(false);
    }
  }
  const columns = new Map<number, typeof cardGeometry>();
  for (const card of cardGeometry) {
    const key = Math.round(card.x);
    columns.set(key, [...(columns.get(key) ?? []), card]);
  }
  for (const cards of columns.values()) {
    cards.sort((first, second) => first.y - second.y);
    for (let index = 1; index < cards.length; index += 1) {
      const gap = cards[index]!.y - cards[index - 1]!.y - cards[index - 1]!.height;
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(52);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('manage-masonry.png'), fullPage: true });
  await page.unroute(manageApi);
  await page.unroute(previewApi);
  await page.goto('/app/gallery');
  await expect(page.getByRole('heading', { name: '图集' })).toBeVisible();
  const galleryTile = page.getByRole('link', { name: /查看照片：/ }).first();
  await expect(galleryTile).toBeVisible();
  await galleryTile.focus();
  await expect(galleryTile).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '成长照片' })).toBeVisible();
  const detailUrl = page.url();
  await expect(page.getByText('合成地点')).toBeVisible();
  await expect(page.getByText('上一张')).toHaveAttribute('aria-disabled', 'true');
  await page.goto('/app/timeline');
  await expect(page.getByRole('heading', { name: /^\d{4} 年 \d{2} 月$/ })).toBeVisible();
  await page.goto('/app/babies/manage');
  await page.getByRole('link', { name: '选择头像' }).click();
  await expect(page.getByRole('heading', { name: '选择头像' })).toBeVisible();
  await page.locator('button[aria-pressed="false"]').first().click();
  await expect(page.getByRole('heading', { name: '宝宝档案' })).toBeVisible();
  await page.goto('/app/home');
  await expect(page.locator('img[alt=""]:visible').first()).toBeVisible();
  const visibleButtonWhiteSpaces = await page
    .locator('button:visible')
    .evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).whiteSpace));
  expect(visibleButtonWhiteSpaces.every((whiteSpace) => whiteSpace === 'nowrap')).toBe(true);
  const avatarShapes = await page
    .locator('header img[alt=""]:visible, main img[alt=""]:visible')
    .evaluateAll((images) =>
      images.map((image) => {
        const frame = image.parentElement!;
        const bounds = frame.getBoundingClientRect();
        const frameStyle = getComputedStyle(frame);
        const imageStyle = getComputedStyle(image);
        return {
          width: bounds.width,
          height: bounds.height,
          radius: frameStyle.borderRadius,
          overflow: frameStyle.overflow,
          borderWidth: frameStyle.borderWidth,
          objectFit: imageStyle.objectFit,
        };
      }),
    );
  expect(avatarShapes.length).toBeGreaterThanOrEqual(2);
  for (const avatar of avatarShapes) {
    expect(Math.abs(avatar.width - avatar.height)).toBeLessThanOrEqual(1);
    expect(avatar.radius).toBe('50%');
    expect(avatar.overflow).toBe('hidden');
    expect(avatar.borderWidth).toBe('1px');
    expect(avatar.objectFit).toBe('cover');
  }
  await page.screenshot({ path: testInfo.outputPath('avatar-home.png') });
  const familySwitcher =
    (page.viewportSize()?.width ?? 1440) < 1024
      ? page.getByRole('button', { name: '打开家庭切换器' })
      : page.locator('header button[aria-expanded]:visible').last();
  await familySwitcher.click();
  const familyMenu = page.getByText('我的家庭').locator('..');
  await expect(familyMenu).toBeVisible();
  const familyMenuBounds = await familyMenu.boundingBox();
  expect(familyMenuBounds).not.toBeNull();
  expect(familyMenuBounds!.x).toBeGreaterThanOrEqual(0);
  expect(familyMenuBounds!.x + familyMenuBounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.screenshot({ path: testInfo.outputPath('family-dropdown.png') });
  await page.keyboard.press('Escape');
  await expect(familyMenu).not.toBeVisible();
  await expect(familySwitcher).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    await expect(page.getByRole('navigation', { name: '移动端主导航' })).toBeVisible();
  } else {
    await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
  }

  const detailApi = /\/api\/v1\/families\/[^/]+\/babies\/[^/]+\/photos\/[^/]+$/;
  await page.route(detailApi, async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as Record<string, unknown>;
    await route.fulfill({ response, json: { ...body, canManage: false } });
  });
  await page.goto(detailUrl);
  await expect(page.getByRole('heading', { name: '成长照片' })).toBeVisible();
  await expect(page.getByRole('button', { name: '编辑信息' })).toHaveCount(0);
  await page.unroute(detailApi);

  const listApi = /\/api\/v1\/families\/[^/]+\/babies\/[^/]+\/photos\/published(?:\?.*)?$/;
  await page.route(listApi, (route) =>
    route.fulfill({ status: 200, json: { items: [], nextCursor: null } }),
  );
  await page.goto('/app/gallery');
  await expect(page.getByText(/还没有已发布照片/)).toBeVisible();
  await page.unroute(listApi);

  let releaseList!: () => void;
  await page.route(listApi, (route) => {
    releaseList = () => void route.fulfill({ status: 200, json: { items: [], nextCursor: null } });
  });
  await page.reload();
  await expect(page.getByText('正在加载图集…')).toBeVisible();
  releaseList();
  await expect(page.getByText(/还没有已发布照片/)).toBeVisible();
  await page.unroute(listApi);

  await page.route(listApi, (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('图集加载失败，请重试。', {
    timeout: 15_000,
  });
  await page.unroute(listApi);

  await page.route(manageApi, (route) =>
    route.fulfill({ status: 200, json: { items: [], nextCursor: null } }),
  );
  await page.goto('/app/photos/manage');
  await expect(page.getByText('这里还没有照片。')).toBeVisible();
  await page.unroute(manageApi);

  let releaseManage!: () => void;
  await page.route(manageApi, (route) => {
    releaseManage = () =>
      void route.fulfill({ status: 200, json: { items: [], nextCursor: null } });
  });
  await page.reload();
  await expect(page.getByText('正在加载照片…')).toBeVisible();
  releaseManage();
  await expect(page.getByText('这里还没有照片。')).toBeVisible();
  await page.unroute(manageApi);

  await page.route(manageApi, (route) => route.abort());
  await page.reload();
  await expect(page.getByText('照片列表加载失败，请重试。')).toBeVisible({ timeout: 15_000 });
  await page.unroute(manageApi);

  const batchApi = /\/api\/v1\/families\/[^/]+\/babies\/[^/]+\/photo-upload-batches\/[^/?]+$/;
  let cardStatus: 'PROCESSING' | 'DRAFT' = 'PROCESSING';
  await page.route(batchApi, async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      photos: Array<Record<string, unknown>>;
    };
    await route.fulfill({
      response,
      json: { ...body, photos: body.photos.map((photo) => ({ ...photo, status: cardStatus })) },
    });
  });
  await page.goto(batchUrl);
  await expect(page.getByText('正在清除元数据并生成变体')).toBeVisible();
  await expect(page.getByText('安全缩略图处理中')).toBeVisible();
  const processingPadding = await page
    .locator('main article')
    .first()
    .evaluate((card) => {
      const style = getComputedStyle(card);
      return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
    });
  expect(processingPadding).toEqual(['16px', '16px', '16px', '16px']);

  cardStatus = 'DRAFT';
  await page.route(previewApi, (route) => route.abort());
  await page.reload();
  await expect(page.getByText('安全缩略图暂不可用')).toBeVisible();
  const unavailablePadding = await page
    .locator('main article')
    .first()
    .evaluate((card) => {
      const style = getComputedStyle(card);
      return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
    });
  expect(unavailablePadding).toEqual(['16px', '16px', '16px', '16px']);
  await page.unroute(previewApi);
  await page.unroute(batchApi);
});
