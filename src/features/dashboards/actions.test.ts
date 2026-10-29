import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  addReportToDashboard,
  deleteDashboard,
  loadBuiltinWidgetData,
  loadReportCatalog,
  loadReportWidgetData,
  loadSavedReport,
  removeWidgetFromDashboard,
  saveDashboard,
  saveDashboardWidgets,
  setDashboardDefault,
} from './actions';

const widget = (id: string) => ({ id, kind: 'report', reportId: 'r', title: null, layout: { x: 0, y: 0, w: 50, h: 24 } });
const dash = (over = {}) => ({ id: 'd1', name: 'Home', description: ' ', isDefault: false, updatedAt: 't1', widgets: [widget('w1'), widget('w2')], ...over });

beforeEach(() => vi.clearAllMocks());

describe('dashboards actions', () => {
  it('loads the catalog and a saved report (null when absent)', async () => {
    api.GET.mockResolvedValue({ data: { datasources: [] } });
    expect(await loadReportCatalog()).toEqual({ success: true, data: { datasources: [] } });
    api.GET.mockResolvedValue({ data: undefined });
    expect(await loadSavedReport('r1')).toEqual({ success: true, data: null });
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/reports/{id}', { params: { path: { id: 'r1' } } });
  });

  it('runs a built-in with its params and a report by id, with the table paging', async () => {
    api.POST.mockResolvedValue({ data: { type: 'TABLE' } });
    await loadBuiltinWidgetData('upcoming', { a: 1 }, { page: 0, size: 50, sort: 'x,asc' });
    expect(api.POST).toHaveBeenLastCalledWith('/api/v1/dashboards/builtins/{key}/data', {
      params: { path: { key: 'upcoming' }, query: { page: 0, size: 50, sort: 'x,asc' } },
      body: { params: { a: 1 } },
    });
    await loadReportWidgetData('r1');
    expect(api.POST).toHaveBeenLastCalledWith('/api/v1/reports/{id}/data', { params: { path: { id: 'r1' }, query: {} } });
  });

  it('creates without an id and updates with one', async () => {
    api.POST.mockResolvedValue({ data: { id: 'n' } });
    api.PUT.mockResolvedValue({ data: { id: 'd1' } });
    const body = { name: 'A', isDefault: false, widgets: [] } as never;
    expect(await saveDashboard(undefined, body)).toEqual({ success: true, data: { id: 'n' } });
    expect(await saveDashboard('d1', body)).toEqual({ success: true, data: { id: 'd1' } });
    expect(api.PUT.mock.calls[0][1].params).toEqual({ path: { id: 'd1' } });
  });

  it('deletes a dashboard', async () => {
    api.DELETE.mockResolvedValue({});
    expect(await deleteDashboard('d1')).toEqual({ success: true, data: null });
  });

  it('puts a dashboard back with other widgets, a blank description dropped', async () => {
    api.PUT.mockResolvedValue({ data: { id: 'd1' } });
    await saveDashboardWidgets(dash() as never, [widget('w1')] as never);
    const body = api.PUT.mock.calls[0][1].body;
    expect(body.description).toBeUndefined();
    expect(body.widgets).toHaveLength(1);
  });

  it('sets the default from the fresh dashboard', async () => {
    api.GET.mockResolvedValue({ data: dash() });
    api.PUT.mockResolvedValue({ data: { id: 'd1', isDefault: true } });
    const res = await setDashboardDefault({ id: 'd1', makeDefault: true, updatedAt: 't1' });
    expect(res).toEqual({ success: true, data: { id: 'd1', isDefault: true } });
    expect(api.PUT.mock.calls[0][1].body.isDefault).toBe(true);
  });

  it('refuses to set the default when the dashboard changed or is gone, with the user-facing message', async () => {
    api.GET.mockResolvedValue({ data: dash({ updatedAt: 't2' }) });
    const stale = await setDashboardDefault({ id: 'd1', makeDefault: true, updatedAt: 't1' });
    expect(stale.success).toBe(false);
    if (!stale.success) expect(stale.error.message).toMatch(/changed since the page was loaded/);
    expect(api.PUT).not.toHaveBeenCalled();
    api.GET.mockResolvedValue({ data: undefined });
    const gone = await setDashboardDefault({ id: 'd1', makeDefault: true, updatedAt: 't1' });
    expect(gone.success === false && gone.error.message).toBe('Dashboard not found');
  });

  it('removes a widget from the fresh dashboard, or answers null when it is already gone', async () => {
    api.GET.mockResolvedValue({ data: dash() });
    api.PUT.mockResolvedValue({ data: { id: 'd1' } });
    expect(await removeWidgetFromDashboard('d1', 'w1')).toEqual({ success: true, data: { id: 'd1' } });
    expect(api.PUT.mock.calls[0][1].body.widgets.map((w: { id: string }) => w.id)).toEqual(['w2']);
    expect(await removeWidgetFromDashboard('d1', 'zzz')).toEqual({ success: true, data: null });
    expect(api.PUT).toHaveBeenCalledTimes(1);
  });

  it('adds a report widget below the fresh dashboard widgets and returns its id', async () => {
    api.GET.mockResolvedValue({ data: dash() });
    api.PUT.mockResolvedValue({ data: { id: 'd1' } });
    const res = await addReportToDashboard('d1', { id: 'r9', name: 'Spend', type: 'KPI' } as never);
    expect(res.success && res.data.saved).toEqual({ id: 'd1' });
    const widgets = api.PUT.mock.calls[0][1].body.widgets;
    expect(widgets).toHaveLength(3);
    expect(res.success && res.data.widgetId).toBe(widgets[2].id);
  });

  it('reports an API failure as a failure result', async () => {
    api.GET.mockRejectedValue(new Error('down'));
    expect((await loadReportCatalog()).success).toBe(false);
  });
});
