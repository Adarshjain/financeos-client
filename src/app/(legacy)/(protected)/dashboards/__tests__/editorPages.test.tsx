import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dashboardsApi = vi.hoisted(() => ({ getById: vi.fn(), builtins: vi.fn() }));
const reportsApi = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ dashboardsApi, reportsApi }));
let qc: QueryClient;
vi.mock('@/lib/query/client', () => ({ getQueryClient: () => qc }));
vi.mock('@/components/dashboards/DashboardEditor', () => ({ DashboardEditor: () => null }));

import { keys } from '@/lib/query/keys';

import DashboardPage from '../[id]/page';
import NewDashboardPage from '../new/page';

type El = {
  props: {
    state: { queries: Array<{ queryKey: unknown; state: { data: unknown } }> };
    children: { props: Record<string, unknown> };
  };
};
const find = (e: El, key: unknown) => e.props.state.queries.find((q) => JSON.stringify(q.queryKey) === JSON.stringify(key));
const catalog = [{ key: 'net_worth' }];

describe('dashboard editor pages', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    reportsApi.list.mockResolvedValue([{ id: 'r1' }]);
    dashboardsApi.builtins.mockResolvedValue(catalog);
    dashboardsApi.getById.mockResolvedValue({ id: 'd1', name: 'Home' });
  });

  it('[id] prefetches the builtins catalog and seeds reports', async () => {
    const el = (await DashboardPage({ params: Promise.resolve({ id: 'd1' }) })) as unknown as El;
    expect(dashboardsApi.getById).toHaveBeenCalledWith('d1');
    expect(find(el, keys.dashboards.builtins())?.state.data).toEqual(catalog);
    expect(find(el, keys.reports.list())?.state.data).toEqual([{ id: 'r1' }]);
    expect(el.props.children.props).toMatchObject({ mode: 'edit', dashboard: { id: 'd1' } });
  });

  it('[id] still renders when the catalog fetch fails', async () => {
    dashboardsApi.builtins.mockRejectedValue(new Error('down'));
    const el = (await DashboardPage({ params: Promise.resolve({ id: 'd1' }) })) as unknown as El;
    expect(find(el, keys.dashboards.builtins())).toBeUndefined();
    expect(find(el, keys.reports.list())).toBeDefined();
    expect(el.props.children.props.mode).toBe('edit');
  });

  it('new prefetches the builtins catalog and seeds reports', async () => {
    const el = (await NewDashboardPage()) as unknown as El;
    expect(find(el, keys.dashboards.builtins())?.state.data).toEqual(catalog);
    expect(find(el, keys.reports.list())?.state.data).toEqual([{ id: 'r1' }]);
    expect(el.props.children.props.mode).toBe('create');
  });

  it('new still renders when the catalog fetch fails', async () => {
    dashboardsApi.builtins.mockRejectedValue(new Error('down'));
    const el = (await NewDashboardPage()) as unknown as El;
    expect(find(el, keys.dashboards.builtins())).toBeUndefined();
    expect(el.props.children.props.mode).toBe('create');
  });
});
