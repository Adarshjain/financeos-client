import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn(), requireAuth: vi.fn(async () => ({ displayName: 'Arjun Mehta', email: 'a@example.test' })) }));
// One cache per request, as on the server.
vi.mock('@/lib/query/client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { getQueryClient: () => new QueryClient() };
});

const dashboardsApi = vi.hoisted(() => ({ list: vi.fn(), builtins: vi.fn() }));
const inboxApi = vi.hoisted(() => ({ summary: vi.fn() }));
const gmailApi = vi.hoisted(() => ({ listConnections: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ dashboardsApi, inboxApi, gmailApi }));
const prefetchDashboardData = vi.hoisted(() => vi.fn());
vi.mock('@/features/dashboards/dashboardData', () => ({ prefetchDashboardData }));

import type { DashboardResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';

import { loadHome } from './homeData';

const board = (id: string, isDefault: boolean) => ({ id, name: id, isDefault, widgets: [] }) as unknown as DashboardResponse;
const queries = (state: { queries: Array<{ queryKey: readonly unknown[] }> }) => state.queries.map((q) => JSON.stringify(q.queryKey));

beforeEach(() => {
  vi.clearAllMocks();
  dashboardsApi.list.mockResolvedValue([board('money', false), board('home', true)]);
  dashboardsApi.builtins.mockResolvedValue([]);
  inboxApi.summary.mockResolvedValue({ actNow: 1, needsLook: 1, info: 0, badge: 2 });
  gmailApi.listConnections.mockResolvedValue([{ lastSyncedAt: '2026-10-12T10:00:00Z' }, { lastSyncedAt: '2026-10-13T06:56:00Z' }, { lastSyncedAt: null }]);
});

describe('loadHome', () => {
  it('reads everything once and hands the browser the cache, the name and the latest sync', async () => {
    const result = await loadHome();
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.displayName).toBe('Arjun Mehta');
    expect(result.data.lastSyncedAt).toBe('2026-10-13T06:56:00Z');
    expect(result.data.needsYou).toBe(2);
    expect(Number.isNaN(Date.parse(result.data.now))).toBe(false);
    expect(queries(result.data.state)).toEqual(
      expect.arrayContaining([JSON.stringify(keys.dashboards.list()), JSON.stringify(keys.dashboards.builtins()), JSON.stringify(keys.inbox.summary())]),
    );
    expect(dashboardsApi.list).toHaveBeenCalledTimes(1);
  });

  it('prefetches the widget data of the default dashboard only', async () => {
    await loadHome();
    expect(prefetchDashboardData).toHaveBeenCalledTimes(1);
    expect(prefetchDashboardData.mock.calls[0][1]).toMatchObject({ id: 'home' });
  });

  it('prefetches nothing when no dashboard is the default', async () => {
    dashboardsApi.list.mockResolvedValue([board('money', false)]);
    const result = await loadHome();
    expect(result.ok).toBe(true);
    expect(prefetchDashboardData).not.toHaveBeenCalled();
  });

  it('only drops the Inbox count and the sync time when their requests fail', async () => {
    inboxApi.summary.mockRejectedValue(new Error('down'));
    gmailApi.listConnections.mockRejectedValue(new Error('down'));
    const result = await loadHome();
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.lastSyncedAt).toBeUndefined();
    expect(result.data.needsYou).toBeUndefined();
    expect(queries(result.data.state)).not.toContain(JSON.stringify(keys.inbox.summary()));
  });

  it('fails the page when the dashboards fail', async () => {
    dashboardsApi.list.mockRejectedValue(new Error('down'));
    expect((await loadHome()).ok).toBe(false);
  });
});
