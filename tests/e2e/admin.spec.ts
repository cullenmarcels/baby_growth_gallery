import { expect, test, type Page } from '@playwright/test';
import {
  adminContext,
  loginInBrowser,
  provisionAccount,
  syntheticUsername,
  webOrigin,
} from './managed-fixtures';

async function openModule(page: Page, name: '家庭管理' | '成员管理') {
  const toggle = page.getByRole('button', { name: '打开后台导航' });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole('navigation', { name: '后台导航' }).getByRole('link', { name }).click();
  const path = name === '成员管理' ? '/admin/members' : '/admin/families';
  await expect(page).toHaveURL((url) => url.pathname === path && !url.search);
}

async function checkListLayout(page: Page, label: string) {
  const compact = page.viewportSize()!.width <= 620;
  await expect(page.getByRole('table', { name: label })).toHaveCSS(
    'display',
    compact ? 'block' : 'table',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
}

test('super admin creates accounts and opens a family through its own detail page', async ({
  page,
  browser,
}) => {
  const manager = await provisionAccount();
  const member = await provisionAccount();
  const admin = await adminContext();
  try {
    const familyName = `新家庭-${syntheticUsername()}`;
    const newUsername = syntheticUsername();
    await loginInBrowser(page, 'synthetic-e2e-admin', process.env.BGG_E2E_ADMIN_PASSWORD!);
    await expect(page).toHaveURL(/\/admin\/members$/);
    await expect(page.getByRole('heading', { name: '成员管理', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '账户菜单' }).click();
    await expect(page.getByRole('link', { name: '返回家庭空间' })).toHaveAttribute('href', '/app');
    await expect(page.getByRole('link', { name: '修改密码' })).toHaveAttribute(
      'href',
      '/change-password',
    );
    await expect(page.getByRole('button', { name: '退出登录' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '新建成员' }).click();
    const create = page.getByRole('dialog', { name: '新建成员' });
    await create.getByLabel('账户名').fill(newUsername);
    await create.getByLabel('显示名').fill('合成新成员');
    await create.getByRole('button', { name: '创建成员' }).click();
    const credential = page.getByRole('dialog', { name: '临时密码' });
    await expect(credential.locator('code')).toBeVisible();
    await credential.getByRole('button', { name: '完成' }).click();
    await expect(credential).toHaveCount(0);
    await page.getByRole('searchbox').fill(newUsername.toUpperCase());
    const newRow = page.getByRole('row').filter({ hasText: newUsername });
    await expect(newRow).toContainText('合成新成员');
    await checkListLayout(page, '成员列表');

    await newRow.getByRole('button', { name: /重置/ }).click();
    await page
      .getByRole('dialog', { name: '重置密码' })
      .getByRole('button', { name: '确认' })
      .click();
    await expect(credential.locator('code')).toBeVisible();
    await page.reload();
    await expect(credential).toHaveCount(0);
    await expect(newRow).toBeVisible();

    await openModule(page, '家庭管理');
    await page.getByRole('button', { name: '新建家庭' }).click();
    const createFamily = page.getByRole('dialog', { name: '新建家庭' });
    await createFamily.getByLabel('家庭名称').fill(familyName);
    await createFamily.getByRole('button', { name: '创建家庭' }).click();
    await expect(createFamily).toHaveCount(0);
    await page.getByRole('searchbox').fill(familyName);
    await page.getByRole('combobox', { name: '状态', exact: true }).selectOption('pending');
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get('q') === familyName && url.searchParams.get('status') === 'pending',
    );
    const familyList = page.url();
    const familyRow = page.getByRole('row').filter({ hasText: familyName });
    await expect(familyRow).toContainText('待开放');
    await expect(familyRow.getByRole('cell', { name: '0', exact: true })).toBeVisible();
    await checkListLayout(page, '家庭列表');
    await familyRow.getByRole('link').click();
    await page.reload();
    await expect(page.getByRole('heading', { name: familyName })).toBeVisible();
    await expect(page.getByText('等待指派首位家庭管理员。')).toBeVisible();
    const form = page.getByRole('region', { name: '家庭成员管理' });
    await form.getByLabel('账户名').fill(manager.username);
    await form.getByLabel('显示名').fill('合成家管');
    await form.getByRole('button', { name: '指派家管' }).click();
    const roster = page.getByRole('table', { name: '成员名单' });
    const managerRow = roster.getByRole('row').filter({ hasText: manager.username });
    await expect(managerRow).toContainText('家庭管理员');
    await checkListLayout(page, '成员名单');
    const familyUrl = new URL(page.url()).pathname;
    await managerRow.getByRole('button', { name: /撤任/ }).click();
    await page
      .getByRole('dialog', { name: '调整角色' })
      .getByRole('button', { name: '确认' })
      .click();
    await expect(page.getByRole('alert')).toHaveText('家庭必须有至少一位有效家管。');
    await expect(managerRow).toContainText('家庭管理员');

    await form.getByLabel('账户名').fill(member.username);
    await form.getByLabel('显示名').fill('合成家人');
    await form.getByRole('button', { name: '添加成员' }).click();
    const rosterMember = roster.getByRole('row').filter({ hasText: member.username });
    await expect(rosterMember).toContainText('家庭成员');
    await rosterMember.getByRole('button', { name: /任命/ }).click();
    await page
      .getByRole('dialog', { name: '调整角色' })
      .getByRole('button', { name: '确认' })
      .click();
    await expect(rosterMember).toContainText('家庭管理员');
    await rosterMember.getByRole('button', { name: /撤任/ }).click();
    await page
      .getByRole('dialog', { name: '调整角色' })
      .getByRole('button', { name: '确认' })
      .click();
    await expect(rosterMember).toContainText('家庭成员');
    await page.getByRole('link', { name: '返回家庭列表' }).click();
    await expect(page).toHaveURL(familyList);
    await expect(page.getByText('没有符合条件的记录。')).toBeVisible();
    await page.getByRole('combobox', { name: '状态', exact: true }).selectOption('open');
    await expect(familyRow.getByRole('cell', { name: '2', exact: true })).toBeVisible();

    await openModule(page, '成员管理');
    await page.getByRole('searchbox').fill(member.username);
    const memberRow = page.getByRole('row').filter({ hasText: member.username });
    await expect(page).toHaveURL((url) => url.searchParams.get('q') === member.username);
    const memberList = page.url();
    await memberRow.getByRole('link').click();
    await expect(page.getByRole('table', { name: '所属家庭' })).toContainText('家庭成员');
    await page.getByRole('link', { name: familyName }).click();
    await expect(page).toHaveURL(new RegExp(`${familyUrl}$`));
    await page.getByRole('link', { name: '返回成员详情' }).click();
    const detailPath = new URL(page.url()).pathname;
    await page.getByRole('link', { name: '返回成员列表' }).click();
    await expect(page).toHaveURL(memberList);

    const accountPath = detailPath.replace('/admin/members/', '/api/v1/management/accounts/');
    const accountResponse = await admin.get(accountPath);
    expect(accountResponse.status()).toBe(200);
    expect(await accountResponse.json()).toEqual({
      id: detailPath.split('/').pop(),
      username: member.username,
      displayName: member.username,
      status: 'ACTIVE',
      families: [{ id: familyUrl.split('/').pop(), name: familyName, role: 'MEMBER' }],
    });

    for (const account of [member, manager]) {
      expect((await account.context.get(accountPath)).status()).toBe(403);
      expect((await account.context.get('/api/v1/management/families')).status()).toBe(403);
      const restricted = await browser.newContext({
        baseURL: page.url(),
        storageState: await account.context.storageState(),
      });
      try {
        const restrictedPage = await restricted.newPage();
        await restrictedPage.goto(familyUrl);
        await expect(restrictedPage.getByRole('alert')).toHaveText('只有超管可以访问此页面。');
        await restrictedPage.goto(detailPath);
        await expect(restrictedPage.getByRole('alert')).toHaveText('只有超管可以访问此页面。');
      } finally {
        await restricted.close();
      }
    }

    await memberRow.getByRole('button', { name: /停用/ }).click();
    await page
      .getByRole('dialog', { name: '停用账号' })
      .getByRole('button', { name: '确认' })
      .click();
    await expect(memberRow).toContainText('已停用');
    await page.goto(familyList);
    await page.getByRole('combobox', { name: '状态', exact: true }).selectOption('open');
    await expect(familyRow.getByRole('cell', { name: '2', exact: true })).toBeVisible();
    await familyRow.getByRole('link').click();
    const disabledRow = roster.getByRole('row').filter({ hasText: member.username });
    await expect(disabledRow).toContainText('已停用');
    await disabledRow.getByRole('button', { name: /移除/ }).click();
    await page
      .getByRole('dialog', { name: '移除成员' })
      .getByRole('button', { name: '确认' })
      .click();
    await expect(disabledRow).toHaveCount(0);
    await page.getByRole('link', { name: '返回家庭列表' }).click();
    await expect(familyRow.getByRole('cell', { name: '1', exact: true })).toBeVisible();
  } finally {
    await Promise.all([admin.dispose(), manager.context.dispose(), member.context.dispose()]);
  }
});

test('admin lists recover loading failures and preserve search, status and page on return', async ({
  page,
}) => {
  const cors = {
    'access-control-allow-origin': webOrigin,
    'access-control-allow-credentials': 'true',
  };
  const items = Array.from({ length: 21 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    username: `fixture_${i + 1}`,
    displayName: `分页成员 ${i + 1}`,
    status: 'DISABLED',
  }));
  const last = items[20]!;
  let failRequest!: () => void;
  const fail = new Promise<void>((resolve) => {
    failRequest = resolve;
  });
  let attempts = 0;
  await page.route('**/api/v1/management/accounts', async (route) => {
    if (attempts++ === 0) {
      await fail;
      await route.fulfill({ status: 503, headers: cors, json: {} });
    } else {
      await route.fulfill({ headers: cors, json: items });
    }
  });
  await page.route(`**/api/v1/management/accounts/${last.id}`, (route) =>
    route.fulfill({ headers: cors, json: { ...last, families: [] } }),
  );
  const families = items.map(({ id }, index) => ({
    id,
    name: `分页家庭 ${index + 1}`,
    isOpen: false,
    memberCount: 0,
  }));
  const lastFamily = families[20]!;
  await page.route('**/api/v1/management/families', (route) =>
    route.fulfill({ headers: cors, json: families }),
  );
  await page.route(`**/api/v1/management/families/${lastFamily.id}`, (route) =>
    route.fulfill({ headers: cors, json: { ...lastFamily, members: [] } }),
  );

  await loginInBrowser(page, 'synthetic-e2e-admin', process.env.BGG_E2E_ADMIN_PASSWORD!);
  await expect(page.getByText('加载中…')).toBeVisible();
  failRequest();
  await page.getByRole('button', { name: '重试' }).click();

  for (const { label, keyword, filter, target, heading, back } of [
    {
      label: '成员列表',
      keyword: '分页成员',
      filter: 'DISABLED',
      target: last.username,
      heading: '成员详情',
      back: '返回成员列表',
    },
    {
      label: '家庭列表',
      keyword: '分页家庭',
      filter: 'pending',
      target: lastFamily.name,
      heading: lastFamily.name,
      back: '返回家庭列表',
    },
  ]) {
    if (label === '家庭列表') await openModule(page, '家庭管理');
    const search = page.getByRole('searchbox');
    const status = page.getByRole('combobox', { name: '状态', exact: true });
    const table = page.getByRole('table', { name: label });
    await search.fill('没有结果');
    await expect(page.getByText('没有符合条件的记录。')).toBeVisible();
    await search.fill(keyword);
    await status.selectOption(filter);
    await expect(table.getByRole('row')).toHaveCount(21);
    await page.getByRole('link', { name: '下一页' }).click();
    await expect(table.getByRole('row')).toHaveCount(2);
    const filteredUrl = page.url();
    expect(new URL(filteredUrl).searchParams.get('page')).toBe('2');
    const link = table.getByRole('link', { name: `查看 ${target} 的详情` });
    await link.click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await page.getByRole('link', { name: back }).click();
    await expect(page).toHaveURL(filteredUrl);
    await expect(search).toHaveValue(keyword);
    await expect(status).toHaveValue(filter);
    await expect(link).toBeVisible();
    await page.getByRole('link', { name: '上一页' }).click();
    await expect(table.getByRole('row')).toHaveCount(21);
  }
});
