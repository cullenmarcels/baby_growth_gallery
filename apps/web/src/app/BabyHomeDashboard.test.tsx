import type {
  GrowthOverview,
  MilestoneOverview,
  MilestoneSummary,
  PublishedPhotoSummary,
} from '@baby-growth-gallery/api-client';
import { ApiClientError } from '@baby-growth-gallery/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, vi } from 'vitest';

import { api } from './api';
import { BabyHomeDashboard } from './BabyHomeDashboard';
import { remindersInWindow } from './baby-home-utils';

const familyId = 'family-home';
const baby = {
  id: 'baby-home',
  familyId,
  nickname: '合成宝宝',
  birthDate: '2025-01-01',
  sex: 'FEMALE' as const,
  status: 'ACTIVE' as const,
  avatarPhotoId: null,
  archivedAt: null,
  purgeAfter: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function milestone(
  id: string,
  reminderOn: string | null,
  state: 'PENDING' | 'COMPLETED' = 'PENDING',
): MilestoneSummary {
  return {
    id,
    babyId: baby.id,
    source: 'CUSTOM',
    templateKey: null,
    title: `里程碑 ${id}`,
    state,
    reminderOn,
    completedOn: state === 'COMPLETED' ? reminderOn : null,
    completedAt: state === 'COMPLETED' ? `${reminderOn}T10:00:00.000Z` : null,
    completionNote: null,
    photoCount: 0,
    createdBy: { membershipId: 'member', displayName: '合成成员' },
    canManage: true,
    version: 1,
    createdAt: `${reminderOn ?? '2026-01-01'}T00:00:00.000Z`,
    updatedAt: `${reminderOn ?? '2026-01-01'}T00:00:00.000Z`,
  };
}

const photo = (id: string, capturedOn: string): PublishedPhotoSummary =>
  ({
    id,
    babyId: baby.id,
    batchId: 'batch',
    status: 'PUBLISHED',
    title: `照片 ${id}`,
    description: null,
    location: null,
    capturedOn,
    sourceFormat: 'JPEG',
    width: 100,
    height: 100,
    publishedAt: `${capturedOn}T10:00:00.000Z`,
    uploadedBy: { displayName: '合成成员' },
    canRestore: false,
    draftExpiresAt: null,
    failureCode: null,
    purgeAfter: null,
    trashedAt: null,
    updatedAt: `${capturedOn}T10:00:00.000Z`,
  }) as PublishedPhotoSummary;

const growth: GrowthOverview = {
  latest: [
    {
      metric: 'LENGTH',
      recordId: 'length-record',
      measuredOn: '2026-10-20',
      value: 81.4,
      reference: { standard: 'WHO_2006', zScore: 0.1, percentile: 54.2, reason: null },
    },
    {
      metric: 'WEIGHT',
      recordId: 'weight-record',
      measuredOn: '2026-10-21',
      value: 10.25,
      reference: { standard: null, zScore: null, percentile: null, reason: 'SEX_MISSING' },
    },
    {
      metric: 'HEAD',
      recordId: 'head-record',
      measuredOn: '2026-10-21',
      value: 45.5,
      reference: { standard: null, zScore: null, percentile: null, reason: 'AGE_UNSUPPORTED' },
    },
    {
      metric: 'BMI',
      recordId: 'bmi-record',
      measuredOn: '2026-10-21',
      value: 15.46,
      reference: { standard: 'WHO_2006', zScore: -0.2, percentile: 42.1, reason: null },
    },
  ],
};

const overview = (reminders: MilestoneSummary[]): MilestoneOverview => ({
  progress: { completed: 2, total: 5 },
  reminders,
  nextCursor: null,
});

function renderDashboard(props = { familyId, baby }) {
  const router = createMemoryRouter(
    [
      { path: '/app/home', element: <BabyHomeDashboard {...props} /> },
      { path: '/app/gallery', element: <h1>完整图集</h1> },
      { path: '/app/photos/:photoId', element: <h1>照片详情</h1> },
      { path: '/app/milestones', element: <h1>里程碑清单</h1> },
      { path: '/app/milestones/:milestoneId', element: <h1>里程碑详情</h1> },
      { path: '/app/growth', element: <h1>成长数据</h1> },
      { path: '/app/growth/new', element: <h1>添加测量</h1> },
      { path: '/app/photos/manage', element: <h1>照片管理</h1> },
      { path: '/app', element: <h1>重新检查</h1> },
    ],
    { initialEntries: ['/app/home'] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, client, router };
}

afterEach(() => vi.restoreAllMocks());

describe('baby home data dashboard', () => {
  it('filters reminders inclusively to 30 Shanghai calendar days and keeps nearest three', () => {
    const items = [
      milestone('day-31', '2026-11-30'),
      milestone('day-30', '2026-11-29'),
      milestone('today', '2026-10-30'),
      milestone('yesterday', '2026-10-29'),
      milestone('day-10', '2026-11-09'),
      milestone('completed', '2026-11-01', 'COMPLETED'),
      milestone('no-date', null),
    ];
    expect(remindersInWindow(items, '2026-10-30').map((item) => item.id)).toEqual([
      'today',
      'day-10',
      'day-30',
    ]);
  });

  it('shows each independent summary, latest metrics, photo detail links and section navigation', async () => {
    vi.spyOn(api, 'listPublishedPhotos').mockResolvedValue({
      items: [photo('photo-a', '2026-10-22'), photo('photo-b', '2026-10-20')],
      nextCursor: null,
    });
    vi.spyOn(api, 'getPhotoPreview').mockResolvedValue({
      url: 'data:image/png;base64,AA==',
      expiresAt: '2026-10-30T16:00:00.000Z',
    });
    vi.spyOn(api, 'getMilestoneOverview').mockResolvedValue(
      overview([milestone('reminder-1', '2026-10-30'), milestone('reminder-2', '2026-11-01')]),
    );
    vi.spyOn(api, 'getGrowthOverview').mockResolvedValue(growth);
    renderDashboard();

    expect(await screen.findByText('2', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('max', '5');
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '2');
    expect(screen.getByText('里程碑 reminder-1')).toBeInTheDocument();
    expect(screen.getByText('81.4 cm')).toBeInTheDocument();
    expect(screen.getByText('10.25 kg')).toBeInTheDocument();
    expect(screen.getByText('45.5 cm')).toBeInTheDocument();
    expect(screen.getByText('15.46 kg/m²')).toBeInTheDocument();
    expect(screen.getByText('WHO 百分位 54.2%')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /查看照片/ })).toHaveLength(2);
    expect(screen.getByRole('link', { name: /查看照片：照片 photo-a/ })).toHaveAttribute(
      'href',
      '/app/photos/photo-a?from=gallery',
    );
    expect(screen.getByRole('link', { name: '查看全部最新照片' })).toHaveAttribute(
      'href',
      '/app/gallery',
    );
    expect(screen.queryByText(/体重.*百分位/)).not.toBeInTheDocument();
  });

  it('keeps a failed photos section isolated and retries only that section', async () => {
    const listPhotos = vi
      .spyOn(api, 'listPublishedPhotos')
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ items: [], nextCursor: null });
    vi.spyOn(api, 'getMilestoneOverview').mockResolvedValue(overview([]));
    vi.spyOn(api, 'getGrowthOverview').mockResolvedValue({ latest: [] });
    renderDashboard();

    expect(await screen.findByText('2', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('照片摘要加载失败，请重试。');
    await userEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('还没有已发布的家庭照片。')).toBeInTheDocument();
    expect(listPhotos).toHaveBeenCalledTimes(2);
  });

  it('clears all dashboard summaries and requests context revalidation on access denial', async () => {
    vi.spyOn(api, 'listPublishedPhotos').mockRejectedValue(
      new ApiClientError('denied', 403, { code: 'BABY_PERMISSION_DENIED' } as never),
    );
    vi.spyOn(api, 'getMilestoneOverview').mockResolvedValue(overview([]));
    vi.spyOn(api, 'getGrowthOverview').mockResolvedValue(growth);
    const { client } = renderDashboard();

    expect(
      await screen.findByText('当前宝宝或家庭访问状态已变化，摘要数据已清除。'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        client.getQueryData(['growth', familyId, baby.id, baby.birthDate, baby.sex, 'overview']),
      ).toBeUndefined();
    });
  });
});
