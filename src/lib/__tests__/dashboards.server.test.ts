import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({
  dashboardsApi: { builtinData: vi.fn() },
  inboxApi: { list: vi.fn() },
  reportsApi: { runSaved: vi.fn() },
}));

import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { dashboardsApi, inboxApi, reportsApi } from '@/lib/apiClient';
import type { DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';

import { builtinWidgetQueryParams, widgetQueryParams } from '../dashboards.helpers';
import { prefetchWidgetData } from '../dashboards.server';

const L = { x: 0, y: 0, w: 50, h: 10 };
const dash = (widgets: WidgetResponse[]) => ({ id: 'd', name: 'D', widgets }) as unknown as DashboardResponse;
const report = (id: string, type: string, available = true): WidgetResponse => ({
  id,
  kind: 'report',
  reportId: `rep-${id}`,
  title: null,
  layout: L,
  report: { name: 'R', type: type as 'KPI', available },
});
const builtin = (id: string, key: string, kind: string, templateType: string | null, params = {}): WidgetResponse => ({
  id,
  kind: 'builtin',
  reportId: null,
  builtinKey: key,
  params,
  title: null,
  layout: L,
  builtin: { key, label: key, minW: 50, kind, templateType },
});

describe('prefetchWidgetData', () => {
  let qc: QueryClient;
  beforeEach(() => {
    vi.resetAllMocks();
    qc = new QueryClient();
    vi.mocked(reportsApi.runSaved).mockResolvedValue({ type: 'KPI' } as never);
    vi.mocked(dashboardsApi.builtinData).mockResolvedValue({ type: 'TABLE' } as never);
    vi.mocked(inboxApi.list).mockResolvedValue({ items: [], summary: { badge: 3 } } as never);
  });

  it('prefetches a KPI report under the report key without paging', async () => {
    await prefetchWidgetData(qc, dash([report('w1', 'KPI')]));
    expect(reportsApi.runSaved).toHaveBeenCalledWith('rep-w1', {});
    expect(qc.getQueryData(keys.dashboards.widget('w1', widgetQueryParams('rep-w1', false, 0, DEFAULT_TABLE_PAGE_SIZE)))).toEqual({ type: 'KPI' });
  });

  it('pages table reports at page 0 with the default size', async () => {
    await prefetchWidgetData(qc, dash([report('w1', 'TABLE')]));
    expect(reportsApi.runSaved).toHaveBeenCalledWith('rep-w1', { page: 0, size: DEFAULT_TABLE_PAGE_SIZE });
  });

  it('prefetches template built-ins through the built-in endpoint with normalized params', async () => {
    await prefetchWidgetData(qc, dash([builtin('w2', 'upcoming', 'template', 'TABLE', { days: 14, x: null })]));
    expect(dashboardsApi.builtinData).toHaveBeenCalledWith('upcoming', { days: 14 }, { page: 0, size: DEFAULT_TABLE_PAGE_SIZE });
    expect(
      qc.getQueryData(keys.dashboards.widget('w2', builtinWidgetQueryParams('upcoming', { days: 14 }, true, 0, DEFAULT_TABLE_PAGE_SIZE))),
    ).toEqual({ type: 'TABLE' });
  });

  it('does not page a KPI template built-in', async () => {
    await prefetchWidgetData(qc, dash([builtin('w3', 'net_worth', 'template', 'KPI')]));
    expect(dashboardsApi.builtinData).toHaveBeenCalledWith('net_worth', {}, {});
  });

  it('skips component built-ins other than the Inbox', async () => {
    await prefetchWidgetData(qc, dash([builtin('w4', 'bills_due', 'component', null, { accountId: 'a' })]));
    expect(dashboardsApi.builtinData).not.toHaveBeenCalled();
    expect(reportsApi.runSaved).not.toHaveBeenCalled();
    expect(inboxApi.list).not.toHaveBeenCalled();
  });

  it('seeds the inbox list and the badge summary once for the attention widget', async () => {
    await prefetchWidgetData(qc, dash([builtin('w5', 'attention', 'component', null), builtin('w6', 'attention', 'component', null)]));
    expect(inboxApi.list).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(keys.inbox.list())).toEqual({ items: [], summary: { badge: 3 } });
    expect(qc.getQueryData(keys.inbox.summary())).toEqual({ badge: 3 });
  });

  it('skips unavailable widgets and report widgets without an id', async () => {
    const noId = { ...report('w7', 'KPI'), reportId: null };
    await prefetchWidgetData(qc, dash([report('w8', 'KPI', false), { ...builtin('w9', 'x', 'template', 'KPI'), builtin: undefined }, noId]));
    expect(reportsApi.runSaved).not.toHaveBeenCalled();
    expect(dashboardsApi.builtinData).not.toHaveBeenCalled();
  });

  it('degrades one failing widget without rejecting or caching it', async () => {
    vi.mocked(reportsApi.runSaved).mockRejectedValueOnce(new Error('boom'));
    await expect(prefetchWidgetData(qc, dash([report('w1', 'KPI'), builtin('w2', 'net_worth', 'template', 'KPI')]))).resolves.toBeUndefined();
    expect(qc.getQueryData(keys.dashboards.widget('w2', builtinWidgetQueryParams('net_worth', {}, false, 0, DEFAULT_TABLE_PAGE_SIZE)))).toBeDefined();
  });
});
