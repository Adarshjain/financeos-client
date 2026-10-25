import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn() }));
// One cache per request, as on the server.
vi.mock('@/lib/query/client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { getQueryClient: () => new QueryClient() };
});

const dashboardsApi = vi.hoisted(() => ({ list: vi.fn(), builtins: vi.fn() }));
const inboxApi = vi.hoisted(() => ({ summary: vi.fn() }));
const gmailApi = vi.hoisted(() => ({ listConnections: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ dashboardsApi, inboxApi, gmailApi }));
const prefetchWidgetData = vi.hoisted(() => vi.fn());
vi.mock('@/lib/dashboards.server', () => ({ prefetchWidgetData }));

import type { DashboardResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';

import { loadHome } from './homeData';

const board = (id: string, isDefault: boolean) => ({ id, name: id, isDefault, widgets: [] }) as unknown as DashboardResponse;
const queries = (state: { queries: Array<{ queryKey: readonly unknown[] }> }) => state.queries.map((q) => JSON.stringify(q.queryKey));

beforeEach(() => {
  vi.clearAllMocks();
  dashboardsApi.list.mockResolvedValue([board('money', false), board('home', true)]);
  dashboardsApi.builtins.mockResolvedValue([]);
});

describe('loadHome', () => {
  it('reads the dashboards and the built-in catalog once and hands the browser the cache', async () => {
    const result = await loadHome();
    if (!result.ok) throw new Error('expected ok');
    expect(queries(result.data.state)).toEqual(expect.arrayContaining([JSON.stringify(keys.dashboards.list()), JSON.stringify(keys.dashboards.builtins())]));
    expect(dashboardsApi.list).toHaveBeenCalledTimes(1);
    expect(dashboardsApi.builtins).toHaveBeenCalledTimes(1);
  });

  it('reads nothing the greeting used (the Inbox count, the Gmail sync) and no widget data', async () => {
    const result = await loadHome();
    if (!result.ok) throw new Error('expected ok');
    expect(inboxApi.summary).not.toHaveBeenCalled();
    expect(gmailApi.listConnections).not.toHaveBeenCalled();
    expect(prefetchWidgetData).not.toHaveBeenCalled();
    expect(queries(result.data.state)).not.toContain(JSON.stringify(keys.inbox.summary()));
  });

  it('works with no default dashboard', async () => {
    dashboardsApi.list.mockResolvedValue([board('money', false)]);
    expect((await loadHome()).ok).toBe(true);
  });

  it('fails the page when the dashboards fail', async () => {
    dashboardsApi.list.mockRejectedValue(new Error('down'));
    expect((await loadHome()).ok).toBe(false);
  });
});
