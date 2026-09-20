import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientError, type ApiProblem } from '@baby-growth-gallery/api-client';
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

function apiError(code: string, status = 400, detail = 'English server detail'): ApiClientError {
  const problem: ApiProblem = {
    type: 'about:blank',
    title: 'Request failed',
    status,
    detail,
    instance: '/api/v1/test',
    traceId: 'synthetic-trace',
    code,
  };
  return new ApiClientError(detail, status, problem);
}

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
  auth.account.activeBabyId = null;
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
    vi.spyOn(api, 'createFamily').mockRejectedValue(
      apiError('FAMILY_STATE_CONFLICT', 409, 'The family membership has changed.'),
    );
    renderRoute(<OnboardingPage />);

    await userEvent.type(screen.getByLabelText('家庭名称'), '测试家庭');
    await userEvent.type(screen.getByLabelText('你在家庭中的称呼'), '测试成员');
    await userEvent.click(screen.getByRole('button', { name: '创建家庭' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '家庭成员状态已经变化，请刷新后重试。',
    );
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
            <Route path="/app/baby-entry" element={<h1>宝宝入口</h1>} />
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

  it('shows the already-member API error in Chinese without exposing server detail', async () => {
    vi.spyOn(api, 'acceptFamilyInvitation').mockRejectedValue(
      apiError('ALREADY_FAMILY_MEMBER', 409, 'This account is already a member of the family.'),
    );
    renderRoute(<OnboardingPage />);

    await userEvent.click(screen.getByRole('tab', { name: '加入家庭' }));
    await userEvent.type(screen.getByLabelText('邀请口令'), '0123-4567-89AB');
    await userEvent.type(screen.getByLabelText('你在家庭中的称呼'), '创建者');
    await userEvent.click(screen.getByRole('button', { name: '加入家庭' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('你已经是这个家庭的成员，无需重复加入。');
    expect(alert).not.toHaveTextContent('This account');
  });

  it('requires confirmation before revoking an invitation', async () => {
    const familyId = '00000000-0000-4000-8000-000000000010';
    vi.spyOn(api, 'getFamily').mockResolvedValue({
      id: familyId,
      name: '合成家庭',
      createdAt: '2026-09-11T00:00:00.000Z',
      currentMembership: {
        id: '00000000-0000-4000-8000-000000000011',
        displayName: '创建者',
        role: 'OWNER',
      },
    });
    vi.spyOn(api, 'listFamilyMembers').mockResolvedValue({
      items: [
        {
          id: '00000000-0000-4000-8000-000000000011',
          displayName: '创建者',
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: '2026-09-11T00:00:00.000Z',
          isCurrentAccount: true,
        },
      ],
    });
    vi.spyOn(api, 'listFamilyInvitations').mockResolvedValue({
      items: [
        {
          id: '00000000-0000-4000-8000-000000000012',
          createdAt: '2026-09-11T00:00:00.000Z',
          expiresAt: '2026-09-18T00:00:00.000Z',
          createdBy: {
            membershipId: '00000000-0000-4000-8000-000000000011',
            displayName: '创建者',
          },
        },
      ],
    });
    vi.spyOn(api, 'listFamilyActivities').mockResolvedValue({ items: [], nextCursor: null });
    const revoke = vi.spyOn(api, 'revokeFamilyInvitation').mockResolvedValue();
    renderRoute(<FamilyPage />, `/app/families/${familyId}`);

    await userEvent.click(await screen.findByRole('button', { name: '撤销' }));
    expect(revoke).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '确认撤销邀请？' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(revoke).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '撤销' }));
    await userEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith(familyId, '00000000-0000-4000-8000-000000000012');
  });

  it('keeps member role changes behind confirmation when using the shared dropdown', async () => {
    const familyId = '00000000-0000-4000-8000-000000000010';
    vi.spyOn(api, 'getFamily').mockResolvedValue({
      id: familyId,
      name: '合成家庭',
      createdAt: '2026-09-11T00:00:00.000Z',
      currentMembership: {
        id: '00000000-0000-4000-8000-000000000011',
        displayName: '创建者',
        role: 'OWNER',
      },
    });
    vi.spyOn(api, 'listFamilyMembers').mockResolvedValue({
      items: [
        {
          id: '00000000-0000-4000-8000-000000000011',
          displayName: '创建者',
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: '2026-09-11T00:00:00.000Z',
          isCurrentAccount: true,
        },
        {
          id: '00000000-0000-4000-8000-000000000012',
          displayName: '合成成员',
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: '2026-09-11T00:00:00.000Z',
          isCurrentAccount: false,
        },
      ],
    });
    vi.spyOn(api, 'listFamilyInvitations').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'listFamilyActivities').mockResolvedValue({ items: [], nextCursor: null });
    const changeRole = vi.spyOn(api, 'changeFamilyMemberRole').mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000012',
      displayName: '合成成员',
      role: 'ADMIN',
      status: 'ACTIVE',
      joinedAt: '2026-09-11T00:00:00.000Z',
      isCurrentAccount: false,
    });
    renderRoute(<FamilyPage />, `/app/families/${familyId}`);

    await userEvent.click(await screen.findByRole('button', { name: '调整 合成成员 的角色' }));
    await userEvent.click(screen.getByRole('option', { name: '管理员' }));
    expect(screen.getByRole('dialog', { name: '确认调整角色？' })).toBeInTheDocument();
    expect(changeRole).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(changeRole).toHaveBeenCalledWith(familyId, '00000000-0000-4000-8000-000000000012', {
      role: 'ADMIN',
    });
  });
});
