import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dashboardsApi = vi.hoisted(() => ({ getById: vi.fn(), builtins: vi.fn() }));
const reportsApi = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ dashboardsApi, reportsApi }));
let qc: QueryClient;
vi.mock('@/lib/query/client', () => ({ getQueryClient: () => qc }));
vi.mock('@/components/dashboards/DashboardEditor', () => ({ DashboardEditor: () => null }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import DashboardPage from '../[id]/page';
import { DashboardsList } from '../DashboardsList';

type El = { props: { children: { props: Record<string, unknown> } } };

describe('[id] page: opening straight into edit mode', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    reportsApi.list.mockResolvedValue([]);
    dashboardsApi.builtins.mockResolvedValue([]);
    dashboardsApi.getById.mockResolvedValue({ id: 'd1', name: 'Home' });
  });

  const render = async (searchParams?: Record<string, string>) =>
    ((await DashboardPage({
      params: Promise.resolve({ id: 'd1' }),
      searchParams: searchParams && Promise.resolve(searchParams),
    })) as unknown as El).props.children.props;

  it('?edit=1 opens the editor already editing', async () => {
    expect(await render({ edit: '1' })).toMatchObject({ mode: 'edit', startEditing: true });
  });

  it('without ?edit=1 it opens in view mode', async () => {
    expect((await render({})).startEditing).toBe(false);
    expect((await render({ edit: 'yes' })).startEditing).toBe(false);
    expect((await render()).startEditing).toBe(false);
  });
});

describe('DashboardsList: card and Edit links', () => {
  beforeEach(() => vi.resetAllMocks());

  it('the card title opens the dashboard; Edit opens it in edit mode; there is no Open button', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [{ id: 'd1', name: 'Home', description: null, isDefault: true, updatedAt: '2026-10-01T00:00:00Z', widgets: [] }],
    } as never);
    renderWithQuery(<DashboardsList />);
    expect(await screen.findByRole('link', { name: 'Home' })).toHaveAttribute('href', '/dashboards/d1');
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/dashboards/d1?edit=1');
    expect(screen.queryByRole('link', { name: 'Open' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
  });
});
