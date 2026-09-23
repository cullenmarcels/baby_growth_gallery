import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  account: {
    id: '00000000-0000-4000-8000-000000000001',
    displayName: null,
    phoneMasked: '+86 136****0000',
    activeFamilyId: '00000000-0000-4000-8000-000000000010' as string | null,
    activeBabyId: null as string | null,
  },
  isLoading: false,
  setAccount: vi.fn(),
}));

vi.mock('./AuthContext', () => ({ useAuth: () => auth }));

import { api } from './api';
import { BabyCreatePage, BabyEntryRedirect, BabyHomePage, BabyManagePage } from './BabyApp';

const familyId = '00000000-0000-4000-8000-000000000010';
const babyId = '00000000-0000-4000-8000-000000000020';

function family(role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'OWNER') {
  return {
    id: familyId,
    name: '合成家庭',
    createdAt: '2026-09-15T00:00:00.000Z',
    currentMembership: {
      id: '00000000-0000-4000-8000-000000000011',
      displayName: '合成成员',
      role,
    },
  } as const;
}

function baby(status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
  return {
    id: babyId,
    familyId,
    nickname: '小星星',
    birthDate: '2026-01-02',
    sex: null,
    avatarPhotoId: null,
    status,
    archivedAt: status === 'ARCHIVED' ? '2026-09-01T00:00:00.000Z' : null,
    purgeAfter: status === 'ARCHIVED' ? '2026-10-01T00:00:00.000Z' : null,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
  } as const;
}

function renderAt(element: React.ReactNode, path: string): void {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app" element={<h1>入口</h1>} />
          <Route path={path} element={element} />
          {path !== '/app/babies/new' ? (
            <Route path="/app/babies/new" element={<h1>新建宝宝档案</h1>} />
          ) : null}
          {path !== '/app/babies/manage' ? (
            <Route path="/app/babies/manage" element={<BabyManagePage />} />
          ) : null}
          <Route path="/app/babies/waiting" element={<h1>等待管理员</h1>} />
          <Route path="/app/home" element={<h1>宝宝首页</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  auth.setAccount.mockReset();
  auth.account.activeBabyId = null;
});

describe('baby profile application states', () => {
  it('links the milestone home card to the real milestone workspace', async () => {
    auth.account.activeBabyId = babyId;
    vi.spyOn(api, 'getBaby').mockResolvedValue(baby());
    renderAt(<BabyHomePage />, '/app/home');

    const milestoneCard = await screen.findByRole('link', { name: /成长里程碑/ });
    expect(milestoneCard).toHaveAttribute('href', '/app/milestones');
    expect(milestoneCard).toHaveTextContent('管理当前宝宝的里程碑清单、提醒与完成记录。');
  });

  it('directs a manager without babies to the create form', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue(family('ADMIN'));
    vi.spyOn(api, 'listBabies').mockResolvedValue({ items: [] });
    renderAt(<BabyEntryRedirect />, '/app/baby-entry');
    expect(await screen.findByRole('heading', { name: '新建宝宝档案' })).toBeInTheDocument();
  });

  it('directs a member without babies to the waiting state', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue(family('MEMBER'));
    vi.spyOn(api, 'listBabies').mockResolvedValue({ items: [] });
    renderAt(<BabyEntryRedirect />, '/app/baby-entry');
    expect(await screen.findByRole('heading', { name: '等待管理员' })).toBeInTheDocument();
  });

  it('synchronizes the server-repaired current baby before entering the home page', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue(family());
    vi.spyOn(api, 'listBabies').mockResolvedValue({ items: [baby()] });
    vi.spyOn(api, 'getSession').mockResolvedValue({ ...auth.account, activeBabyId: babyId });
    renderAt(<BabyEntryRedirect />, '/app/baby-entry');
    expect(await screen.findByText('正在同步当前宝宝…')).toBeInTheDocument();
    expect(api.getSession).toHaveBeenCalled();
    expect(auth.setAccount).toHaveBeenCalledWith(expect.objectContaining({ activeBabyId: babyId }));
  });

  it('validates required create fields and saves a real baby profile', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue(family());
    const create = vi.spyOn(api, 'createBaby').mockResolvedValue(baby());
    vi.spyOn(api, 'activateBaby').mockResolvedValue({ ...auth.account, activeBabyId: babyId });
    renderAt(<BabyCreatePage />, '/app/babies/new');
    await userEvent.click(await screen.findByRole('button', { name: '创建宝宝档案' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('请输入宝宝昵称');
    expect(create).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('宝宝昵称'), '  小星星  ');
    await userEvent.type(screen.getByLabelText('出生日期'), '2026-01-02');
    await userEvent.click(screen.getByRole('button', { name: '创建宝宝档案' }));
    expect(await screen.findByRole('heading', { name: '宝宝首页' })).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith(familyId, {
      nickname: '小星星',
      birthDate: '2026-01-02',
      sex: null,
    });
  });

  it('cancels a new profile into the empty management page without creating a baby', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue(family());
    vi.spyOn(api, 'listBabies').mockResolvedValue({ items: [] });
    const create = vi.spyOn(api, 'createBaby');
    renderAt(<BabyCreatePage />, '/app/babies/new');

    await userEvent.type(await screen.findByLabelText('宝宝昵称'), '未保存的昵称');
    await userEvent.click(screen.getByRole('button', { name: '取消' }));

    const heading = await screen.findByRole('heading', { name: '宝宝档案' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('家庭中还没有宝宝档案。')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('saves the selected optional sex from the shared dropdown', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue(family());
    const create = vi.spyOn(api, 'createBaby').mockResolvedValue(baby());
    vi.spyOn(api, 'activateBaby').mockResolvedValue({ ...auth.account, activeBabyId: babyId });
    renderAt(<BabyCreatePage />, '/app/babies/new');

    await userEvent.type(await screen.findByLabelText('宝宝昵称'), '小星星');
    await userEvent.type(screen.getByLabelText('出生日期'), '2026-01-02');
    await userEvent.click(screen.getByRole('button', { name: '性别（选填）' }));
    await userEvent.click(screen.getByRole('option', { name: '女宝宝' }));
    await userEvent.click(screen.getByRole('button', { name: '创建宝宝档案' }));

    expect(create).toHaveBeenCalledWith(familyId, {
      nickname: '小星星',
      birthDate: '2026-01-02',
      sex: 'FEMALE',
    });
  });

  it('requires confirmation before archiving and exposes archived recovery', async () => {
    auth.account.activeBabyId = babyId;
    vi.spyOn(api, 'getFamily').mockResolvedValue(family());
    vi.spyOn(api, 'listBabies').mockResolvedValue({ items: [baby()] });
    const archive = vi
      .spyOn(api, 'archiveBaby')
      .mockResolvedValue({ ...auth.account, activeBabyId: null });
    renderAt(<BabyManagePage />, '/app/babies/manage');
    await userEvent.click(await screen.findByRole('button', { name: '归档' }));
    expect(archive).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '确认归档宝宝档案？' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(archive).toHaveBeenCalledWith(familyId, babyId);
    expect(await screen.findByText('宝宝档案已归档，可在 30 天内恢复。')).toBeInTheDocument();
  });
});
