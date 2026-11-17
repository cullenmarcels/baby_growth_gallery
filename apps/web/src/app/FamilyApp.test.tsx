import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  account: {
    id: '00000000-0000-4000-8000-000000000001',
    displayName: null,
    username: 'fixture-user',
    siteRole: 'USER' as const,
    mustChangePassword: false,
    mustAcceptTerms: false,
    activeFamilyId: '00000000-0000-4000-8000-000000000010' as string | null,
    activeBabyId: null as string | null,
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
  auth.account.activeBabyId = null;
});

describe('family application states', () => {
  it('shows a waiting state for an account without a family', async () => {
    vi.spyOn(api, 'listFamilies').mockResolvedValue({ items: [] });
    renderRoute(<OnboardingPage />);
    expect(await screen.findByRole('heading', { name: '等待加入家庭' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();
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

    renderRoute(<FamilyPage />, `/app/families/${familyId}`);

    expect(await screen.findByRole('heading', { name: '合成家庭' })).toBeInTheDocument();
    expect(await screen.findByText('家庭动态还是空的。')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '成员管理' })).not.toBeInTheDocument();
  });

  it('renders a safe family access error without mounting family data panels', async () => {
    vi.spyOn(api, 'getFamily').mockRejectedValue(new Error('not found'));
    renderRoute(<FamilyPage />, '/app/families/00000000-0000-4000-8000-000000000099');

    expect(await screen.findByText('无法访问这个家庭，成员状态可能已经变化。')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '家庭成员' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回当前家庭' })).toHaveAttribute('href', '/app');
  });
});
