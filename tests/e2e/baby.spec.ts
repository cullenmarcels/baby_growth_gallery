import { expect, test } from '@playwright/test';
import {
  assignMember,
  createManagedFamily,
  loginInBrowser,
  post,
  provisionAccount,
} from './managed-fixtures';

test('enforces baby profile permissions, family scope, current-baby fallback, and recovery', async ({
  request: _request,
}, testInfo) => {
  void _request;
  test.skip(testInfo.project.name !== 'chromium-1440', 'API contract is viewport-independent');
  const owner = await provisionAccount();
  const member = await provisionAccount();
  const family = await createManagedFamily(owner, '宝宝测试家庭', '创建者');
  const first = await post(owner.context, `/api/v1/families/${family.id}/babies`, owner.csrf, {
    nickname: '小星星',
    birthDate: '2026-01-02',
    sex: null,
  });
  expect(first.status()).toBe(201);
  const firstBaby = (await first.json()) as { id: string; nickname: string };
  const second = await post(owner.context, `/api/v1/families/${family.id}/babies`, owner.csrf, {
    nickname: '小星星',
    birthDate: '2025-06-01',
    sex: 'FEMALE',
  });
  expect(second.status()).toBe(201);
  const secondBaby = (await second.json()) as { id: string };
  expect(
    (
      (await owner.context.get('/api/v1/auth/session').then((response) => response.json())) as {
        activeBabyId: string;
      }
    ).activeBabyId,
  ).toBe(secondBaby.id);

  expect(await assignMember(family.id, member.username, '普通成员')).toBe(204);
  const memberList = await member.context.get(`/api/v1/families/${family.id}/babies`);
  expect(memberList.status()).toBe(200);
  expect(((await memberList.json()) as { items: unknown[] }).items).toHaveLength(2);
  const memberCreate = await post(
    member.context,
    `/api/v1/families/${family.id}/babies`,
    member.csrf,
    {
      nickname: '越权创建',
      birthDate: '2026-01-01',
    },
  );
  expect(memberCreate.status()).toBe(403);
  expect(((await memberCreate.json()) as { code: string }).code).toBe('BABY_PERMISSION_DENIED');

  const activateFirst = await post(
    owner.context,
    `/api/v1/families/${family.id}/babies/${firstBaby.id}/activate`,
    owner.csrf,
  );
  expect(((await activateFirst.json()) as { activeBabyId: string }).activeBabyId).toBe(
    firstBaby.id,
  );
  const archived = await post(
    owner.context,
    `/api/v1/families/${family.id}/babies/${firstBaby.id}/archive`,
    owner.csrf,
  );
  expect(archived.status()).toBe(200);
  expect(((await archived.json()) as { activeBabyId: string }).activeBabyId).toBe(secondBaby.id);
  const hidden = await member.context.get(`/api/v1/families/${family.id}/babies/${firstBaby.id}`);
  expect(hidden.status()).toBe(404);
  const restored = await post(
    owner.context,
    `/api/v1/families/${family.id}/babies/${firstBaby.id}/restore`,
    owner.csrf,
  );
  expect(restored.status()).toBe(200);
  expect(((await restored.json()) as { nickname: string }).nickname).toBe('小星星');
  expect(
    (
      (await owner.context.get('/api/v1/auth/session').then((response) => response.json())) as {
        activeBabyId: string;
      }
    ).activeBabyId,
  ).toBe(firstBaby.id);

  const otherFamilyId = (await createManagedFamily(owner, '隔离家庭', '创建者')).id;
  const crossFamily = await owner.context.get(
    `/api/v1/families/${otherFamilyId}/babies/${firstBaby.id}`,
  );
  expect(crossFamily.status()).toBe(404);
  expect(((await crossFamily.json()) as { code: string }).code).toBe('BABY_NOT_FOUND');
  await owner.context.dispose();
  await member.context.dispose();
});

test('creates a baby profile from the responsive family application without horizontal overflow', async ({
  page,
}) => {
  const owner = await provisionAccount();
  await createManagedFamily(owner, '合成成长家庭', '合成家管');
  await loginInBrowser(page, owner.username, owner.password);
  await owner.context.dispose();
  await expect(page).toHaveURL(/\/app\/babies\/new$/);
  await page.goto('/app/babies/new');
  await expect(page.getByRole('heading', { name: '记录成长故事的主角' })).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page).toHaveURL(/\/app\/babies\/manage$/);
  await expect(page.getByText('家庭中还没有宝宝档案。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '宝宝档案' })).toBeFocused();
  await page.getByRole('link', { name: '新建档案' }).click();
  await page.getByLabel('宝宝昵称').fill('小星星');
  await page.getByLabel('出生日期').fill('2026-01-02');
  await page.getByRole('button', { name: '性别（选填）' }).click();
  await expect(page.getByRole('listbox', { name: '性别（选填）' })).toBeVisible();
  await page.getByRole('option', { name: '女宝宝' }).click();
  await page.getByRole('button', { name: '创建宝宝档案' }).click();
  await expect(page.getByRole('heading', { name: '小星星' })).toBeVisible();
  await expect(page.getByText(/女宝宝/)).toBeVisible();
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
  await page.goto('/app/babies/manage');
  await expect(page.getByRole('button', { name: /小星星.*当前宝宝/ })).toBeVisible();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  const editActions = page.locator('section[aria-label^="编辑"]');
  const cancel = editActions.getByRole('button', { name: '取消' });
  const save = editActions.getByRole('button', { name: '保存修改' });
  const [cancelBox, saveBox] = await Promise.all([cancel.boundingBox(), save.boundingBox()]);
  expect(cancelBox).not.toBeNull();
  expect(saveBox).not.toBeNull();
  expect(Math.abs(cancelBox!.height - saveBox!.height)).toBeLessThanOrEqual(1);
  expect(saveBox!.height).toBe(44);
  await cancel.click();
  await expect(editActions).toHaveCount(0);
});
