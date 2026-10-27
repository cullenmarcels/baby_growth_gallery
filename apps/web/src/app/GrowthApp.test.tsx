import type { GrowthRecord } from '@baby-growth-gallery/api-client';
import { ApiClientError } from '@baby-growth-gallery/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ account: { activeFamilyId: 'family', activeBabyId: 'baby' } }),
}));
import { api } from './api';
import { GrowthChart, GrowthFormPage, GrowthPage } from './GrowthApp';

const item: GrowthRecord = {
  id: 'record',
  babyId: 'baby',
  measuredOn: '2026-01-02',
  lengthCm: null,
  weightKg: 4,
  headCm: null,
  bmi: null,
  note: '合成备注',
  measurementPosition: null,
  status: 'ACTIVE',
  version: 1,
  createdBy: { displayName: '合成成员' },
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  purgeAfter: null,
  canManage: true,
  canRestore: false,
  canPurge: false,
  dateConflict: false,
  measurements: [
    {
      metric: 'WEIGHT',
      value: 4,
      reference: { standard: null, zScore: null, percentile: null, reason: 'SEX_MISSING' },
    },
  ],
};
function renderPage(path = '/app/growth') {
  const router = createMemoryRouter(
    [
      { path: '/app/growth', element: <GrowthPage /> },
      { path: '/app/growth/new', element: <GrowthFormPage /> },
      { path: '/app/growth/:recordId/edit', element: <GrowthFormPage /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}
beforeEach(() => {
  vi.spyOn(api, 'getBaby').mockResolvedValue({
    id: 'baby',
    familyId: 'family',
    nickname: '合成宝宝',
    birthDate: '2025-01-01',
    sex: null,
    status: 'ACTIVE',
    avatarPhotoId: null,
    archivedAt: null,
    purgeAfter: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  });
  vi.spyOn(api, 'getGrowthOverview').mockResolvedValue({ latest: [] });
  vi.spyOn(api, 'listGrowthRecords').mockResolvedValue({ items: [item], nextCursor: null });
  vi.spyOn(api, 'getGrowthSeries').mockResolvedValue({
    items: [],
    nextCursor: null,
    referenceCurve: [],
  });
});
afterEach(() => vi.restoreAllMocks());
describe('growth interface', () => {
  it('shows real authors, partial measurements and unavailable-reference reasons', async () => {
    renderPage();
    expect(await screen.findByText(/记录者：合成成员/)).toBeInTheDocument();
    expect(screen.getByText('4.00 kg')).toBeInTheDocument();
    expect(screen.getByText('填写宝宝性别后可查看 WHO 参考。')).toBeInTheDocument();
    expect(screen.getByText('仅供家庭记录，不构成医疗诊断')).toBeInTheDocument();
  });
  it('does not offer author recovery or deletion for administrator-restricted trash', async () => {
    vi.mocked(api.listGrowthRecords).mockResolvedValue({
      items: [
        {
          ...item,
          status: 'TRASHED',
          canManage: false,
          canRestore: false,
          purgeAfter: '2099-01-01T00:00:00Z',
        },
      ],
      nextCursor: null,
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: '回收站' }));
    expect(await screen.findByText(/需由家庭管理员恢复/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '恢复' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '彻底删除' })).not.toBeInTheDocument();
  });
  it('preserves input after save failure and maps unknown errors to Chinese', async () => {
    vi.spyOn(api, 'createGrowthRecord').mockRejectedValue(new Error('private database failure'));
    renderPage('/app/growth/new');
    const weight = await screen.findByLabelText('体重（kg）');
    await userEvent.type(weight, '4.21');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('操作失败，请稍后重试。');
    expect(weight).toHaveValue(4.21);
    expect(screen.queryByText('private database failure')).not.toBeInTheDocument();
  });
  it('shows a version conflict and retains the edited note', async () => {
    vi.spyOn(api, 'getGrowthRecord').mockResolvedValue(item);
    vi.spyOn(api, 'updateGrowthRecord').mockRejectedValue(
      new ApiClientError('conflict', 409, { code: 'GROWTH_STATE_CONFLICT' } as never),
    );
    renderPage('/app/growth/record/edit');
    const note = await screen.findByLabelText('备注');
    await userEvent.clear(note);
    await userEvent.type(note, '保留输入');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('记录已经变化');
    expect(note).toHaveValue('保留输入');
  });
  it('keeps one measured point and accessible text rather than inventing a line', async () => {
    render(
      <GrowthChart
        metric="WEIGHT"
        pages={[{ items: [item], nextCursor: null, referenceCurve: [] }]}
      />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(/体重曲线/);
    expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(1);
    expect(screen.getByRole('img').querySelectorAll('polyline')).toHaveLength(0);
    expect(screen.getByText('2026-01-02：4.00 kg', { selector: 'li' })).toBeInTheDocument();
  });
  it('removes stale private records on a forbidden refetch', async () => {
    vi.mocked(api.listGrowthRecords).mockRejectedValue(
      new ApiClientError('unavailable', 404, { code: 'BABY_NOT_FOUND' } as never),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('找不到这个宝宝档案');
    expect(screen.queryByText(/记录者：合成成员/)).not.toBeInTheDocument();
  });
});
