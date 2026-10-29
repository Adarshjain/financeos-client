import { beforeEach, describe, expect, it, vi } from 'vitest';

const notFound = vi.hoisted(() => vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
}));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn() }));
// One cache per request, as on the server.
vi.mock('@/lib/query/client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { getQueryClient: () => new QueryClient() };
});

const dashboardsApi = vi.hoisted(() => ({ getById: vi.fn(), builtins: vi.fn() }));
const reportsApi = vi.hoisted(() => ({ list: vi.fn(), getById: vi.fn(), getDatasource: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ dashboardsApi, reportsApi }));
const prefetchWidgetData = vi.hoisted(() => vi.fn());
vi.mock('@/lib/dashboards.server', () => ({ prefetchWidgetData }));

import { ApiError } from '@/lib/api/client';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';

import { loadDashboardPage } from './dashboardData';

const dashboard = {
  id: 'd1',
  name: 'Money',
  widgets: [
    { id: 'w1', kind: 'report', reportId: 'r1', layout: {}, report: { available: true } },
    { id: 'w2', kind: 'report', reportId: 'r1', layout: {}, report: { available: true } },
    { id: 'w3', kind: 'report', reportId: 'gone', layout: {}, report: { available: false } },
    { id: 'w4', kind: 'builtin', builtinKey: 'net_worth', layout: {}, builtin: { key: 'net_worth' } },
  ],
} as unknown as DashboardResponse;

const queries = (state: { queries: Array<{ queryKey: readonly unknown[] }> }) => state.queries.map((q) => JSON.stringify(q.queryKey));

beforeEach(() => {
  vi.clearAllMocks();
  dashboardsApi.getById.mockResolvedValue(dashboard);
  dashboardsApi.builtins.mockResolvedValue([{ key: 'net_worth' }]);
  reportsApi.list.mockResolvedValue([{ id: 'r1', name: 'Spend' }]);
  reportsApi.getById.mockResolvedValue({ id: 'r1', datasource: 'transactions', definition: {} });
  reportsApi.getDatasource.mockResolvedValue({ datasources: [], operators: {} });
});

describe('loadDashboardPage', () => {
  it('fetches the dashboard, reports and built-in catalog once, and hydrates the list and the catalog', async () => {
    const { dashboard: loaded, state } = await loadDashboardPage('d1');
    expect(loaded).toBe(dashboard);
    expect(dashboardsApi.getById).toHaveBeenCalledWith('d1');
    expect(reportsApi.list).toHaveBeenCalledTimes(1);
    expect(dashboardsApi.builtins).toHaveBeenCalledTimes(1);
    const cached = queries(state);
    expect(cached).toContain(JSON.stringify(keys.reports.list()));
    expect(cached).toContain(JSON.stringify(keys.dashboards.builtins()));
  });

  it('reads no widget data: each widget loads when it scrolls into view', async () => {
    const { state } = await loadDashboardPage('d1');
    expect(prefetchWidgetData).not.toHaveBeenCalled();
    expect(reportsApi.getById).not.toHaveBeenCalled();
    expect(reportsApi.getDatasource).not.toHaveBeenCalled();
    const cached = queries(state);
    expect(cached).not.toContain(JSON.stringify(keys.reports.byId('r1')));
    expect(cached).not.toContain(JSON.stringify(keys.reports.catalog()));
  });

  it('is a 404 when the dashboard does not exist', async () => {
    dashboardsApi.getById.mockRejectedValue(new ApiError(404, { message: 'nope' } as never));
    await expect(loadDashboardPage('missing')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('any other failure is the page\'s failure', async () => {
    dashboardsApi.getById.mockRejectedValue(new ApiError(500, { message: 'down' } as never));
    await expect(loadDashboardPage('d1')).rejects.toBeInstanceOf(ApiError);
    expect(notFound).not.toHaveBeenCalled();
  });

  it('the report list only degrades: the page still loads without it', async () => {
    reportsApi.list.mockRejectedValue(new Error('down'));
    const { state } = await loadDashboardPage('d1');
    expect(queries(state)).not.toContain(JSON.stringify(keys.reports.list()));
  });

  it('the Add dashboard page loads no dashboard, only the reports and the catalog', async () => {
    const { dashboard: none, state } = await loadDashboardPage();
    expect(none).toBeUndefined();
    expect(dashboardsApi.getById).not.toHaveBeenCalled();
    expect(prefetchWidgetData).not.toHaveBeenCalled();
    expect(queries(state)).toContain(JSON.stringify(keys.dashboards.builtins()));
  });
});
