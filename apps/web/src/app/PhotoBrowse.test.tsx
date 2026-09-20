import { ApiClientError, type PhotoSummary } from '@baby-growth-gallery/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, vi } from 'vitest';

const familyId = '00000000-0000-4000-8000-000000000010';
const babyId = '00000000-0000-4000-8000-000000000020';
const photoId = '00000000-0000-4000-8000-000000000030';
const auth = vi.hoisted(() => ({
  account: {
    activeFamilyId: '00000000-0000-4000-8000-000000000010',
    activeBabyId: '00000000-0000-4000-8000-000000000020',
  },
}));
vi.mock('./AuthContext', () => ({ useAuth: () => auth }));

import { api } from './api';
import { BabyAvatarPickerPage, GalleryPage, PhotoDetailPage, TimelinePage } from './PhotoBrowse';

const photo: PhotoSummary = {
  id: photoId,
  babyId,
  batchId: '00000000-0000-4000-8000-000000000040',
  status: 'PUBLISHED',
  title: '合成生日照',
  description: '合成描述',
  capturedOn: '2026-09-16',
  location: '合成地点',
  sourceFormat: 'PNG',
  width: 20,
  height: 20,
  draftExpiresAt: null,
  publishedAt: '2026-09-17T02:00:00.000Z',
  trashedAt: null,
  purgeAfter: null,
  canRestore: false,
  failureCode: null,
  updatedAt: '2026-09-17T02:00:00.000Z',
};

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/app/gallery', element: <GalleryPage /> },
      { path: '/app/timeline', element: <TimelinePage /> },
      { path: '/app/photos/:photoId', element: <PhotoDetailPage /> },
      { path: '/app/babies/avatar', element: <BabyAvatarPickerPage /> },
      { path: '/app/babies/manage', element: <h1>宝宝管理</h1> },
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

describe('published photo browsing', () => {
  it('shows an empty gallery, then a published tile with a private thumbnail', async () => {
    vi.spyOn(api, 'listPublishedPhotos').mockResolvedValue({ items: [], nextCursor: null });
    renderAt('/app/gallery');
    expect(await screen.findByText(/还没有已发布照片/)).toBeInTheDocument();
  });

  it('uses the published photo dimensions for the gallery tile ratio', async () => {
    vi.spyOn(api, 'listPublishedPhotos').mockResolvedValue({ items: [photo], nextCursor: null });
    vi.spyOn(api, 'getPhotoPreview').mockResolvedValue({
      url: 'data:image/png;base64,AA==',
      expiresAt: '2026-09-17T02:05:00.000Z',
    });
    renderAt('/app/gallery');
    const imageFrame = await screen.findByRole('img', { name: '合成生日照' });
    expect(imageFrame.parentElement).toHaveStyle({ aspectRatio: '20 / 20' });
  });

  it('groups the real photo timeline by month without milestone placeholders', async () => {
    vi.spyOn(api, 'listTimeline').mockResolvedValue({
      items: [{ kind: 'PHOTO', eventOn: photo.capturedOn, photo }],
      nextCursor: null,
    });
    vi.spyOn(api, 'getPhotoPreview').mockResolvedValue({
      url: 'data:image/png;base64,AA==',
      expiresAt: '2026-09-17T02:05:00.000Z',
    });
    renderAt('/app/timeline');
    expect(await screen.findByRole('heading', { name: '2026 年 09 月' })).toBeInTheDocument();
    const timelineTile = screen.getByRole('link', { name: /合成生日照/ });
    expect(timelineTile).toHaveAttribute(
      'href',
      `/app/photos/${photoId}`,
    );
    expect(timelineTile.firstElementChild).not.toHaveAttribute('style');
    expect(screen.queryByText(/里程碑/)).not.toBeInTheDocument();
  });

  it('keeps a Chinese recovery state when the list request fails', async () => {
    vi.spyOn(api, 'listPublishedPhotos').mockRejectedValue(new Error('synthetic-network-failure'));
    renderAt('/app/gallery');
    expect(await screen.findByRole('alert')).toHaveTextContent('图集加载失败，请重试。');
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  it('shows a loading state until the list is returned', async () => {
    let complete!: (value: { items: PhotoSummary[]; nextCursor: null }) => void;
    vi.spyOn(api, 'listPublishedPhotos').mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    renderAt('/app/gallery');
    expect(screen.getByText('正在加载图集…')).toBeInTheDocument();
    complete({ items: [], nextCursor: null });
    expect(await screen.findByText(/还没有已发布照片/)).toBeInTheDocument();
  });

  it('requests a fresh private thumbnail when a signed image stops loading', async () => {
    vi.spyOn(api, 'listPublishedPhotos').mockResolvedValue({ items: [photo], nextCursor: null });
    const preview = vi
      .spyOn(api, 'getPhotoPreview')
      .mockResolvedValueOnce({
        url: 'https://private.example/expired',
        expiresAt: '2026-09-17T02:05:00.000Z',
      })
      .mockResolvedValueOnce({
        url: 'https://private.example/renewed',
        expiresAt: '2026-09-17T02:10:00.000Z',
      });
    renderAt('/app/gallery');
    const image = await screen.findByRole('img', { name: '合成生日照' });
    expect(image).toHaveAttribute('src', 'https://private.example/expired');
    fireEvent.error(image);
    expect(await screen.findByRole('img', { name: '合成生日照' })).toHaveAttribute(
      'src',
      'https://private.example/renewed',
    );
    expect(preview).toHaveBeenCalledTimes(2);
  });

  it('honors detail manage permission and disables boundary navigation', async () => {
    vi.spyOn(api, 'getPublishedPhoto').mockResolvedValue({
      photo,
      canManage: false,
      previousPhotoId: null,
      nextPhotoId: null,
    });
    vi.spyOn(api, 'getPhotoPreview').mockResolvedValue({
      url: 'data:image/png;base64,AA==',
      expiresAt: '2026-09-17T02:05:00.000Z',
    });
    renderAt(`/app/photos/${photoId}`);
    expect(await screen.findByRole('heading', { name: '合成生日照' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑信息' })).not.toBeInTheDocument();
    expect(screen.getByText('上一张')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('下一张')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('合成地点')).toBeInTheDocument();
  });

  it('does not jump to another photo when the detail link is no longer valid', async () => {
    vi.spyOn(api, 'getPublishedPhoto').mockRejectedValue(
      new ApiClientError('gone', 404, {
        type: 'about:blank',
        title: 'gone',
        status: 404,
        detail: 'gone',
        instance: '/synthetic',
        traceId: 'synthetic',
        code: 'PHOTO_NOT_FOUND',
      }),
    );
    renderAt(`/app/photos/${photoId}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('找不到这张照片，或你无权访问。');
    expect(screen.queryByRole('heading', { name: '合成生日照' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回图集' })).toBeInTheDocument();
  });

  it('keeps a recycled photo on a Chinese state instead of opening its neighbor', async () => {
    vi.spyOn(api, 'getPublishedPhoto')
      .mockResolvedValueOnce({ photo, canManage: true, previousPhotoId: null, nextPhotoId: null })
      .mockRejectedValue(new Error('photo-recycled'));
    vi.spyOn(api, 'getPhotoPreview').mockResolvedValue({
      url: 'data:image/png;base64,AA==',
      expiresAt: '2026-09-17T02:05:00.000Z',
    });
    vi.spyOn(api, 'trashPhoto').mockResolvedValue({ ...photo, status: 'TRASHED' });
    renderAt(`/app/photos/${photoId}`);
    await userEvent.click(await screen.findByRole('button', { name: '回收' }));
    await userEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(await screen.findByText('照片已放入回收站，图集与时间轴已更新。')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '合成生日照' })).not.toBeInTheDocument();
  });

  it('lets a manager clear the selected avatar with the dedicated API', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue({
      id: familyId,
      name: '合成家庭',
      createdAt: '2026-09-17T00:00:00.000Z',
      currentMembership: {
        id: '00000000-0000-4000-8000-000000000050',
        displayName: '合成管理员',
        role: 'ADMIN',
      },
    });
    vi.spyOn(api, 'getBaby').mockResolvedValue({
      id: babyId,
      familyId,
      nickname: '合成宝宝',
      birthDate: '2026-01-01',
      sex: null,
      avatarPhotoId: photoId,
      status: 'ACTIVE',
      archivedAt: null,
      purgeAfter: null,
      createdAt: '2026-09-17T00:00:00.000Z',
      updatedAt: '2026-09-17T00:00:00.000Z',
    });
    vi.spyOn(api, 'listPublishedPhotos').mockResolvedValue({ items: [photo], nextCursor: null });
    vi.spyOn(api, 'getPhotoPreview').mockResolvedValue({
      url: 'data:image/png;base64,AA==',
      expiresAt: '2026-09-17T02:05:00.000Z',
    });
    const setAvatar = vi.spyOn(api, 'setBabyAvatar').mockResolvedValue({
      id: babyId,
      familyId,
      nickname: '合成宝宝',
      birthDate: '2026-01-01',
      sex: null,
      avatarPhotoId: null,
      status: 'ACTIVE',
      archivedAt: null,
      purgeAfter: null,
      createdAt: '2026-09-17T00:00:00.000Z',
      updatedAt: '2026-09-17T00:00:00.000Z',
    });
    renderAt('/app/babies/avatar');
    await userEvent.click(await screen.findByRole('button', { name: '清除头像' }));
    expect(setAvatar).toHaveBeenCalledWith(familyId, babyId, null);
    expect(await screen.findByRole('heading', { name: '宝宝管理' })).toBeInTheDocument();
  });
});
