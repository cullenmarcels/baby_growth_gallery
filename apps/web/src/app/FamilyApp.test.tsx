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
  },
  isLoading: false,
  setAccount: vi.fn(),
}));

vi.mock('./AuthContext', () => ({ useAuth: () => auth }));

import { api } from './api';
import { AppHomeRedirect, FamilyPage, OnboardingPage } from './FamilyApp';

function renderRoute(element: React.ReactNode, initialPath = '/app/onboarding'): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/app/onboarding" element={element} />
          <Route path="/app/families/:familyId" element={element} />
          <Route path="/app" element={element} />
          <Route path="/result/:familyId" element={<h1>已进入家庭</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

afterEach(() => {
  auth.setAccount.mockReset();
  auth.account.activeFamilyId = '00000000-0000-4000-8000-000000000010';
});

describe('family application states', () => {
  it('switches onboarding modes and exposes field validation without submitting', async () => {
    const create = vi.spyOn(api, 'createFamily');
    renderRoute(<OnboardingPage />);

    await userEvent.click(screen.getByRole('button', { name: '创建家庭' }));
    expect(await screen.findAllByText('请输入家庭名称')).toHaveLength(2);
    expect(create).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('tab', { name: '加入家庭' }));
    expect(screen.getByLabelText('邀请口令')).toBeInTheDocument();
    expect(screen.getByText(/仅可由一位成员使用一次/)).toBeInTheDocument();
  });

  it('shows a recoverable server error when family creation fails', async () => {
    vi.spyOn(api, 'createFamily').mockRejectedValue(new Error('家庭状态已经变化，请重试。'));
    renderRoute(<OnboardingPage />);

    await userEvent.type(screen.getByLabelText('家庭名称'), '测试家庭');
    await userEvent.type(screen.getByLabelText('你在家庭中的称呼'), '测试成员');
    await userEvent.click(screen.getByRole('button', { name: '创建家庭' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('家庭状态已经变化，请重试。');
    expect(auth.setAccount).not.toHaveBeenCalled();
  });

  it('redirects an account without families to onboarding', async () => {
    vi.spyOn(api, 'listFamilies').mockResolvedValue({ items: [] });
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route path="/app" element={<AppHomeRedirect />} />
            <Route path="/app/onboarding" element={<h1>首次家庭引导</h1>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: '首次家庭引导' })).toBeInTheDocument();
  });

  it('renders member permissions and the empty activity state from family-scoped queries', async () => {
    const familyId = '00000000-0000-4000-8000-000000000010';
    vi.spyOn(api, 'getFamily').mockResolvedValue({
      id: familyId,
      name: '合成家庭',
      createdAt: '2026-09-11T00:00:00.000Z',
      currentMembership: {
        id: '00000000-0000-4000-8000-000000000011',
        displayName: '普通成员',
        role: 'MEMBER',
      },
    });
    vi.spyOn(api, 'listFamilyMembers').mockResolvedValue({
      items: [
        {
          id: '00000000-0000-4000-8000-000000000011',
          displayName: '普通成员',
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: '2026-09-11T00:00:00.000Z',
          isCurrentAccount: true,
        },
      ],
    });
    vi.spyOn(api, 'listFamilyActivities').mockResolvedValue({ items: [], nextCursor: null });
    const invitations = vi.spyOn(api, 'listFamilyInvitations');

    renderRoute(<FamilyPage />, `/app/families/${familyId}`);

    expect(await screen.findByRole('heading', { name: '合成家庭' })).toBeInTheDocument();
    expect(screen.getByText('你可以查看家庭内容，但没有邀请管理权限。')).toBeInTheDocument();
    expect(await screen.findByText('家庭动态还是空的。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '生成一次性邀请' })).not.toBeInTheDocument();
    expect(invitations).not.toHaveBeenCalled();
  });

  it('renders a safe family access error without mounting family data panels', async () => {
    vi.spyOn(api, 'getFamily').mockRejectedValue(new Error('not found'));
    renderRoute(<FamilyPage />, '/app/families/00000000-0000-4000-8000-000000000099');

    expect(await screen.findByText('无法访问这个家庭，成员状态可能已经变化。')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '家庭成员' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回当前家庭' })).toHaveAttribute('href', '/app');
  });
});
