import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  account: {
    id: '00000000-0000-4000-8000-000000000001',
    displayName: null,
    phoneMasked: '+86 136****0000',
    activeFamilyId: '00000000-0000-4000-8000-000000000010',
    activeBabyId: '00000000-0000-4000-8000-000000000020',
  },
  isLoading: false,
  setAccount: vi.fn(),
}));

vi.mock('./AuthContext', () => ({ useAuth: () => auth }));

import { api } from './api';
import { PhotoManagePage, PhotoUploadPage } from './PhotoApp';

function renderPage(page: React.ReactNode, initialEntry = '/app/photos/upload') {
  const router = createMemoryRouter([{ path: '*', element: page }], {
    initialEntries: [initialEntry],
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('photo upload application states', () => {
  it('offers click, album, camera and drag-capable input without a bottom navigation', () => {
    renderPage(<PhotoUploadPage />);
    expect(screen.getByRole('heading', { name: '把珍贵瞬间放进家庭记忆' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /从相册选择/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /拍照/ })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '移动端导航' })).not.toBeInTheDocument();
  });

  it('rejects a 21-photo batch in Chinese before calling the API', async () => {
    const create = vi.spyOn(api, 'createPhotoUploadBatch');
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider
          router={createMemoryRouter([{ path: '*', element: <PhotoUploadPage /> }], {
            initialEntries: ['/app/photos/upload'],
          })}
        />
      </QueryClientProvider>,
    );
    const input = container.querySelector('input[multiple]') as HTMLInputElement;
    const files = Array.from(
      { length: 21 },
      (_, index) => new File(['x'], `synthetic-${index}.jpg`, { type: 'image/jpeg' }),
    );
    fireEvent.change(input, { target: { files } });
    expect(await screen.findByRole('status')).toHaveTextContent('每批最多选择 20 张照片');
    expect(create).not.toHaveBeenCalled();
  });

  it('shows the family-published tab only for managers and keeps an empty Chinese state', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue({
      id: auth.account.activeFamilyId,
      name: '合成家庭',
      createdAt: '2026-09-16T00:00:00.000Z',
      currentMembership: {
        id: '00000000-0000-4000-8000-000000000011',
        displayName: '合成成员',
        role: 'ADMIN',
      },
    });
    vi.spyOn(api, 'managePhotos').mockResolvedValue({ items: [], nextCursor: null });
    renderPage(<PhotoManagePage />);
    expect(await screen.findByRole('button', { name: '家庭已发布' })).toBeInTheDocument();
    expect(await screen.findByText('这里还没有照片。')).toBeInTheDocument();
  });

  it('loads the next opaque management page without replacing the first page', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue({
      id: auth.account.activeFamilyId,
      name: '合成家庭',
      createdAt: '2026-09-16T00:00:00.000Z',
      currentMembership: {
        id: '00000000-0000-4000-8000-000000000011',
        displayName: '合成成员',
        role: 'OWNER',
      },
    });
    const first = {
      id: '00000000-0000-4000-8000-000000000031',
      batchId: '00000000-0000-4000-8000-000000000041',
      babyId: auth.account.activeBabyId,
      status: 'PUBLISHED' as const,
      title: '第一页照片',
      description: null,
      capturedOn: '2026-09-15',
      location: null,
      sourceFormat: 'PNG' as const,
      width: 32,
      height: 24,
      draftExpiresAt: null,
      publishedAt: '2026-09-16T01:00:00.000Z',
      trashedAt: null,
      purgeAfter: null,
      failureCode: null,
      updatedAt: '2026-09-16T01:00:00.000Z',
    };
    const second = {
      ...first,
      id: '00000000-0000-4000-8000-000000000032',
      title: '第二页照片',
      updatedAt: '2026-09-16T00:00:00.000Z',
    };
    const manage = vi
      .spyOn(api, 'managePhotos')
      .mockResolvedValueOnce({ items: [first], nextCursor: 'opaque-next' })
      .mockResolvedValueOnce({ items: [second], nextCursor: null });
    vi.spyOn(api, 'getPhotoPreview').mockResolvedValue({
      url: 'data:image/webp;base64,UklGRg==',
      expiresAt: '2026-09-16T01:05:00.000Z',
    });
    renderPage(<PhotoManagePage />);
    expect(await screen.findByText('第一页照片')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '加载更多' }));
    expect(await screen.findByText('第二页照片')).toBeInTheDocument();
    expect(screen.getByText('第一页照片')).toBeInTheDocument();
    expect(manage).toHaveBeenLastCalledWith(
      auth.account.activeFamilyId,
      auth.account.activeBabyId,
      expect.objectContaining({ cursor: 'opaque-next' }),
    );
  });

  it('recovers a private draft from its batch URL and replaces the HEIC placeholder with a safe thumbnail', async () => {
    const recovered = {
      id: '00000000-0000-4000-8000-000000000031',
      batchId: '00000000-0000-4000-8000-000000000041',
      babyId: auth.account.activeBabyId,
      status: 'DRAFT' as const,
      title: '合成照片',
      description: null,
      capturedOn: '2026-09-15',
      location: null,
      sourceFormat: 'HEIC' as const,
      width: 32,
      height: 24,
      draftExpiresAt: '2026-10-16T01:00:00.000Z',
      publishedAt: null,
      trashedAt: null,
      purgeAfter: null,
      failureCode: null,
      updatedAt: '2026-09-16T01:00:00.000Z',
    };
    const getBatch = vi.spyOn(api, 'getPhotoUploadBatch').mockResolvedValue({
      id: recovered.batchId,
      babyId: recovered.babyId,
      createdAt: '2026-09-16T00:00:00.000Z',
      photos: [recovered],
    });
    const getPreview = vi.spyOn(api, 'getPhotoPreview').mockResolvedValue({
      url: 'data:image/webp;base64,UklGRg==',
      expiresAt: '2026-09-16T01:05:00.000Z',
    });
    renderPage(<PhotoUploadPage />, `/app/photos/upload?batchId=${recovered.batchId}`);
    expect(await screen.findByText('私有草稿已就绪')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: '所选照片 1' })).toHaveAttribute(
      'src',
      'data:image/webp;base64,UklGRg==',
    );
    expect(screen.getByRole('button', { name: '保存信息' })).toBeInTheDocument();
    expect(getBatch).toHaveBeenCalledWith(
      auth.account.activeFamilyId,
      auth.account.activeBabyId,
      recovered.batchId,
    );
    expect(getPreview).toHaveBeenCalledWith(
      auth.account.activeFamilyId,
      auth.account.activeBabyId,
      recovered.id,
      'THUMBNAIL',
    );
  });

  it('shows a Chinese recovery path when a batch is unavailable', async () => {
    vi.spyOn(api, 'getPhotoUploadBatch').mockRejectedValue(new Error('synthetic network failure'));
    renderPage(
      <PhotoUploadPage />,
      '/app/photos/upload?batchId=00000000-0000-4000-8000-000000000041',
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('无法恢复这个上传批次');
    fireEvent.click(screen.getByRole('button', { name: '重新开始' }));
    expect(screen.getByRole('heading', { name: '选择或拖放照片' })).toBeInTheDocument();
  });

  it('links processing items to the recoverable batch and confirms before discard', async () => {
    vi.spyOn(api, 'getFamily').mockResolvedValue({
      id: auth.account.activeFamilyId,
      name: '合成家庭',
      createdAt: '2026-09-16T00:00:00.000Z',
      currentMembership: {
        id: '00000000-0000-4000-8000-000000000011',
        displayName: '合成成员',
        role: 'MEMBER',
      },
    });
    const processing = {
      id: '00000000-0000-4000-8000-000000000031',
      batchId: '00000000-0000-4000-8000-000000000041',
      babyId: auth.account.activeBabyId,
      status: 'PROCESSING' as const,
      title: null,
      description: null,
      capturedOn: '2026-09-15',
      location: null,
      sourceFormat: null,
      width: null,
      height: null,
      draftExpiresAt: null,
      publishedAt: null,
      trashedAt: null,
      purgeAfter: null,
      failureCode: null,
      updatedAt: '2026-09-16T01:00:00.000Z',
    };
    vi.spyOn(api, 'managePhotos').mockResolvedValue({ items: [processing], nextCursor: null });
    const discard = vi.spyOn(api, 'discardPhoto').mockResolvedValue(undefined);
    renderPage(<PhotoManagePage />);
    expect(await screen.findByRole('link', { name: '查看上传批次' })).toHaveAttribute(
      'href',
      `/app/photos/upload?batchId=${processing.batchId}`,
    );
    expect(screen.queryByRole('button', { name: '家庭已发布' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '丢弃' }));
    expect(screen.getByRole('dialog', { name: '丢弃私有项目？' })).toBeInTheDocument();
    expect(discard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(discard).not.toHaveBeenCalled();
  });

  it('blocks in-app navigation while an XHR upload is active and aborts only after confirmation', async () => {
    let aborts = 0;
    class PendingUpload extends EventTarget {
      upload = new EventTarget();
      status = 0;
      open(): void {}
      send(): void {}
      abort(): void {
        aborts += 1;
        this.dispatchEvent(new Event('abort'));
      }
    }
    vi.stubGlobal('XMLHttpRequest', PendingUpload);
    const batchId = '00000000-0000-4000-8000-000000000041';
    const photoId = '00000000-0000-4000-8000-000000000031';
    const batch = {
      id: batchId,
      babyId: auth.account.activeBabyId,
      createdAt: '2026-09-16T00:00:00.000Z',
      photos: [
        {
          id: photoId,
          batchId,
          babyId: auth.account.activeBabyId,
          status: 'AWAITING_UPLOAD' as const,
          title: null,
          description: null,
          capturedOn: '2026-09-16',
          location: null,
          sourceFormat: null,
          width: null,
          height: null,
          draftExpiresAt: null,
          publishedAt: null,
          trashedAt: null,
          purgeAfter: null,
          failureCode: null,
          updatedAt: '2026-09-16T00:00:00.000Z',
        },
      ],
      uploadInstructions: [
        {
          photoId,
          url: 'https://storage.example/synthetic',
          fields: { key: 'quarantine/synthetic' },
          expiresAt: '2026-09-16T00:10:00.000Z',
        },
      ],
    };
    vi.spyOn(api, 'createPhotoUploadBatch').mockResolvedValue(batch);
    vi.spyOn(api, 'getPhotoUploadBatch').mockResolvedValue(batch);
    const router = renderPage(<PhotoUploadPage />);
    const input = document.querySelector('input[multiple]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['synthetic'], 'synthetic.heic', { type: 'image/heic' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: '开始上传' }));
    expect(await screen.findByText('上传中 0%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '我的上传' }));
    expect(screen.getByRole('dialog', { name: '离开上传页面？' })).toBeInTheDocument();
    expect(aborts).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(router.state.location.pathname).toBe('/app/photos/upload');
    fireEvent.click(screen.getByRole('link', { name: '我的上传' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/photos/manage'));
    expect(aborts).toBe(1);
  });
});
