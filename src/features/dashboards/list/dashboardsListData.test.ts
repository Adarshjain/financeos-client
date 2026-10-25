import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn() }));
vi.mock('@/lib/query/client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { getQueryClient: () => new QueryClient() };
});

const dashboardsApi = vi.hoisted(() => ({ list: vi.fn(), builtins: vi.fn() }));
const reportsApi = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ dashboardsApi, reportsApi }));

import { keys } from '@/lib/query/keys';

import { loadDashboardsList } from './dashboardsListData';

const queries = (state: { queries: Array<{ queryKey: readonly unknown[] }> }) => state.queries.map((q) => JSON.stringify(q.queryKey));

beforeEach(() => {
  vi.clearAllMocks();
  dashboardsApi.list.mockResolvedValue([{ id: 'd1' }]);
  dashboardsApi.builtins.mockResolvedValue([{ key: 'net_worth' }]);
  reportsApi.list.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
});

describe('loadDashboardsList', () => {
  it('reads the dashboards, the catalog and the reports once, for the browser cache', async () => {
    const result = await loadDashboardsList();
    if (!result.ok) throw new Error('expected ok');
    expect(queries(result.data)).toEqual(
      expect.arrayContaining([JSON.stringify(keys.dashboards.list()), JSON.stringify(keys.dashboards.builtins()), JSON.stringify(keys.reports.list())]),
    );
    expect(dashboardsApi.list).toHaveBeenCalledTimes(1);
  });

  it('only leaves the catalog and the reports count to the browser when they fail', async () => {
    dashboardsApi.builtins.mockRejectedValue(new Error('down'));
    reportsApi.list.mockRejectedValue(new Error('down'));
    const result = await loadDashboardsList();
    if (!result.ok) throw new Error('expected ok');
    expect(queries(result.data)).toContain(JSON.stringify(keys.dashboards.list()));
    expect(queries(result.data)).not.toContain(JSON.stringify(keys.reports.list()));
  });

  it('fails the page when the dashboards fail', async () => {
    dashboardsApi.list.mockRejectedValue(new Error('down'));
    expect((await loadDashboardsList()).ok).toBe(false);
  });
});
