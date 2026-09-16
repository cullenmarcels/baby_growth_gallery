import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

function renderPage(page: React.ReactNode): void {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

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
        <MemoryRouter>
          <PhotoUploadPage />
        </MemoryRouter>
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
});
