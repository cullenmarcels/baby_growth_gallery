import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { server } from '../test/setup';
import { StatusPage } from './StatusPage';

const endpoint = 'http://localhost:3000/api/v1/health/ready';

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StatusPage />
    </QueryClientProvider>,
  );
}

describe('StatusPage', () => {
  it('shows the loading state', () => {
    server.use(
      http.get(endpoint, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    renderPage();
    expect(screen.getByRole('heading', { name: '正在连接服务' })).toBeInTheDocument();
  });

  it('shows generated-contract readiness data on success', async () => {
    server.use(
      http.get(endpoint, () =>
        HttpResponse.json({
          status: 'ok',
          service: 'baby-growth-gallery-api',
          version: '0.1.0',
          timestamp: new Date().toISOString(),
          dependencies: { postgres: 'up', redis: 'up', objectStorage: 'up' },
        }),
      ),
    );
    renderPage();
    expect(await screen.findByRole('heading', { name: '前后端连接正常' })).toBeInTheDocument();
    expect(screen.getAllByText('up')).toHaveLength(3);
  });

  it('shows the error state and retries', async () => {
    let calls = 0;
    server.use(
      http.get(endpoint, () => {
        calls += 1;
        if (calls === 1) return HttpResponse.json({ detail: 'down' }, { status: 503 });
        return HttpResponse.json({
          status: 'ok',
          service: 'baby-growth-gallery-api',
          version: '0.1.0',
          timestamp: new Date().toISOString(),
          dependencies: { postgres: 'up', redis: 'up', objectStorage: 'up' },
        });
      }),
    );
    renderPage();
    const retry = await screen.findByRole('button', { name: '重新连接' });
    await userEvent.click(retry);
    expect(await screen.findByRole('heading', { name: '前后端连接正常' })).toBeInTheDocument();
  });
});
