import type { MilestoneDetail, MilestoneSummary } from '@baby-growth-gallery/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, vi } from 'vitest';

const familyId = '00000000-0000-4000-8000-000000000010';
const babyId = '00000000-0000-4000-8000-000000000020';
const milestoneId = '00000000-0000-4000-8000-000000000030';
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ account: { activeFamilyId: familyId, activeBabyId: babyId } }),
}));

import { api } from './api';
import { MilestoneDetailPage, MilestoneNewPage, MilestonePage } from './MilestoneApp';

const milestone: MilestoneSummary = {
  id: milestoneId,
  babyId,
  source: 'CUSTOM',
  templateKey: null,
  title: '第一次看海',
  state: 'PENDING',
  reminderOn: '2026-09-21',
  completedOn: null,
  completionNote: null,
  completedAt: null,
  photoCount: 0,
  createdBy: { membershipId: '00000000-0000-4000-8000-000000000040', displayName: '妈妈' },
  canManage: true,
  version: 1,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
};

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/app/milestones', element: <MilestonePage /> },
      { path: '/app/milestones/new', element: <MilestoneNewPage /> },
      { path: '/app/milestones/:milestoneId', element: <MilestoneDetailPage /> },
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

afterEach(() => vi.restoreAllMocks());

describe('milestone pages', () => {
  it('shows real progress, reminders, pending list and completed list', async () => {
    const completed = {
      ...milestone,
      id: '00000000-0000-4000-8000-000000000031',
      title: '第一次翻身',
      state: 'COMPLETED' as const,
      completedOn: '2026-09-19',
      completedAt: '2026-09-19T10:00:00.000Z',
    };
    vi.spyOn(api, 'getMilestoneOverview').mockResolvedValue({
      progress: { completed: 1, total: 2 },
      reminders: [milestone],
      nextCursor: null,
    });
    vi.spyOn(api, 'listMilestones').mockImplementation((_family, _baby, query) =>
      Promise.resolve({
        items: query.state === 'PENDING' ? [milestone] : [completed],
        nextCursor: null,
      }),
    );
    renderAt('/app/milestones');
    expect(await screen.findByText('1 / 2')).toBeInTheDocument();
    expect(screen.getAllByText('第一次看海').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('tab', { name: '已完成' }));
    expect((await screen.findAllByText('第一次翻身')).length).toBeGreaterThan(0);
  });

  it('keeps loaded reminders visible when the next reminder page fails', async () => {
    vi.spyOn(api, 'getMilestoneOverview')
      .mockResolvedValueOnce({
        progress: { completed: 0, total: 1 },
        reminders: [milestone],
        nextCursor: 'next-reminder-page',
      })
      .mockRejectedValueOnce(new Error('network'));
    vi.spyOn(api, 'listMilestones').mockResolvedValue({ items: [], nextCursor: null });
    renderAt('/app/milestones');
    expect((await screen.findAllByText('第一次看海')).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: '加载更多' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('更多提醒加载失败，请重试。');
    expect(screen.getAllByText('第一次看海').length).toBeGreaterThan(0);
  });

  it('disables a template already in the checklist', async () => {
    vi.spyOn(api, 'listMilestoneTemplates').mockResolvedValue({
      items: [
        { key: 'FIRST_STEP', title: '迈出第一步', isAdded: true },
        { key: 'FIRST_CRAWL', title: '第一次爬行', isAdded: false },
      ],
    });
    renderAt('/app/milestones/new');
    expect(await screen.findByRole('button', { name: '已加入' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '加入' })).toBeEnabled();
  });

  it('honors server canManage on detail and completes with the current version', async () => {
    const detail: MilestoneDetail = { ...milestone, photos: [] };
    vi.spyOn(api, 'getMilestone').mockResolvedValue(detail);
    vi.spyOn(api, 'getBaby').mockResolvedValue({
      id: babyId,
      familyId,
      nickname: '宝宝',
      birthDate: '2026-01-01',
      sex: null,
      avatarPhotoId: null,
      status: 'ACTIVE',
      archivedAt: null,
      purgeAfter: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const complete = vi.spyOn(api, 'completeMilestone').mockResolvedValue({
      ...detail,
      state: 'COMPLETED',
      completedOn: '2026-09-20',
      completedAt: '2026-09-20T08:00:00.000Z',
      version: 2,
    });
    renderAt(`/app/milestones/${milestoneId}`);
    await userEvent.click(await screen.findByRole('button', { name: '完成' }));
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(complete).toHaveBeenCalledWith(
      familyId,
      babyId,
      milestoneId,
      expect.objectContaining({ expectedVersion: 1, photoIds: [] }),
    );
  });

  it('edits a custom title without resubmitting an unchanged past reminder', async () => {
    const detail: MilestoneDetail = {
      ...milestone,
      reminderOn: '2026-09-01',
      photos: [],
    };
    vi.spyOn(api, 'getMilestone').mockResolvedValue(detail);
    vi.spyOn(api, 'getBaby').mockResolvedValue({
      id: babyId,
      familyId,
      nickname: '宝宝',
      birthDate: '2026-01-01',
      sex: null,
      avatarPhotoId: null,
      status: 'ACTIVE',
      archivedAt: null,
      purgeAfter: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const update = vi.spyOn(api, 'updateMilestone').mockResolvedValue({
      ...detail,
      title: '第一次看日出',
      version: 2,
    });
    renderAt(`/app/milestones/${milestoneId}`);
    await userEvent.click(await screen.findByRole('button', { name: '编辑' }));
    const title = screen.getByLabelText('标题');
    await userEvent.clear(title);
    await userEvent.type(title, '第一次看日出');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(update).toHaveBeenCalledWith(familyId, babyId, milestoneId, {
      expectedVersion: 1,
      title: '第一次看日出',
    });
  });
});
