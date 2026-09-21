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

test('shares milestones, enforces author management, and updates progress and timeline', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport-independent');
  const owner = await registerAccount();
  const author = await registerAccount();
  const reader = await registerAccount();
  const familyResponse = await post(owner.context, '/api/v1/families', owner.csrf, {
    name: '合成里程碑家庭',
    displayName: '创建者',
  });
  const familyId = ((await familyResponse.json()) as { id: string }).id;
  const babyResponse = await post(
    owner.context,
    `/api/v1/families/${familyId}/babies`,
    owner.csrf,
    { nickname: '合成宝宝', birthDate: '2026-01-02', sex: null },
  );
  const babyId = ((await babyResponse.json()) as { id: string }).id;
  await joinFamily(owner, author, familyId, '记录者');
  await joinFamily(owner, reader, familyId, '只读成员');
  const base = `/api/v1/families/${familyId}/babies/${babyId}`;

  const templates = await author.context.get(`${base}/milestone-templates`);
  expect(templates.status()).toBe(200);
  expect(((await templates.json()) as { items: unknown[] }).items).toHaveLength(12);

  const createdResponse = await post(author.context, `${base}/milestones`, author.csrf, {
    source: 'CUSTOM',
    title: '第一次看海',
    reminderOn: localToday(),
  });
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()) as { id: string; version: number };

  const readerDetail = await reader.context.get(`${base}/milestones/${created.id}`);
  expect(readerDetail.status()).toBe(200);
  expect((await readerDetail.json()) as { canManage: boolean }).toMatchObject({ canManage: false });
  const denied = await reader.context.patch(`${base}/milestones/${created.id}`, {
    headers: { Origin: webOrigin, 'x-csrf-token': reader.csrf },
    data: { expectedVersion: created.version, title: '越权修改' },
  });
  expect(denied.status()).toBe(403);
  expect(((await denied.json()) as { code: string }).code).toBe('MILESTONE_PERMISSION_DENIED');

  const completedResponse = await post(
    author.context,
    `${base}/milestones/${created.id}/complete`,
    author.csrf,
    {
      expectedVersion: created.version,
      completedOn: localToday(),
      completionNote: '全家一起见证',
      photoIds: [],
    },
  );
  expect(completedResponse.status()).toBe(200);
  const completed = (await completedResponse.json()) as { version: number; state: string };
  expect(completed.state).toBe('COMPLETED');
  const overview = await owner.context.get(`${base}/milestones/overview?fromOn=${localToday()}`);
  expect(
    (await overview.json()) as { progress: { completed: number; total: number } },
  ).toMatchObject({
    progress: { completed: 1, total: 1 },
  });
  const timeline = await owner.context.get(`${base}/timeline`);
  expect(
    ((await timeline.json()) as { items: Array<{ kind: string; milestone?: { id: string } }> })
      .items,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'MILESTONE',
        milestone: expect.objectContaining({ id: created.id }),
      }),
    ]),
  );

  const reopened = await post(
    author.context,
    `${base}/milestones/${created.id}/reopen`,
    author.csrf,
    { expectedVersion: completed.version },
  );
  expect(reopened.status()).toBe(200);
  expect(await reopened.json()).toMatchObject({
    state: 'PENDING',
    completedOn: null,
    completionNote: null,
    photos: [],
  });
  const timelineAfterReopen = (await (await owner.context.get(`${base}/timeline`)).json()) as {
    items: Array<{ kind: string; milestone?: { id: string } }>;
  };
  expect(
    timelineAfterReopen.items.some(
      (item) => item.kind === 'MILESTONE' && item.milestone?.id === created.id,
    ),
  ).toBe(false);

  await Promise.all([owner.context.dispose(), author.context.dispose(), reader.context.dispose()]);
});
