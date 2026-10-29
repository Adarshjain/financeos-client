import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  createReport,
  deleteReport,
  duplicateReportCopy,
  loadBreakdownSection,
  loadReportFieldValues,
  loadRowBreakdown,
  loadUnderlying,
  runAdHocReport,
  updateReport,
} from './actions';

const request = { type: 'KPI', datasource: 'transactions', definition: { measure: 'amount', aggregation: 'sum', filters: [] } } as never;

beforeEach(() => vi.clearAllMocks());

describe('reports actions', () => {
  it('loads a row breakdown at the page size', async () => {
    api.GET.mockResolvedValue({ data: { title: 'x' } });
    expect(await loadRowBreakdown('net_worth', 'a1', 25)).toEqual({ success: true, data: { title: 'x' } });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown', {
      params: { path: { name: 'net_worth', rowId: 'a1' }, query: { size: 25 } },
    });
  });

  it('loads a breakdown section page, adding sort only when set', async () => {
    api.GET.mockResolvedValue({ data: { rows: [] } });
    await loadBreakdownSection('d', 'r', 's', 1, 10, 'amount,desc');
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}', {
      params: { path: { name: 'd', rowId: 'r', section: 's' }, query: { page: 1, size: 10, sort: 'amount,desc' } },
    });
    await loadBreakdownSection('d', 'r', 's', 1, 10);
    expect(api.GET.mock.calls[1][1].params.query).toEqual({ page: 1, size: 10 });
  });

  it('loads underlying rows from the endpoint of each source kind', async () => {
    api.POST.mockResolvedValue({ data: { rows: [] } });
    const q = { period: 'current', page: 0, size: 50, sort: 'date,desc' } as const;
    await loadUnderlying({ kind: 'saved', reportId: 'r1' }, q);
    expect(api.POST).toHaveBeenLastCalledWith('/api/v1/reports/{id}/underlying', { params: { path: { id: 'r1' }, query: q } });
    await loadUnderlying({ kind: 'adhoc', request }, q);
    expect(api.POST.mock.calls[1][0]).toBe('/api/v1/reports/underlying');
    expect(api.POST.mock.calls[1][1].body).toMatchObject({ type: 'KPI' });
    await loadUnderlying({ kind: 'builtin', key: 'k', params: { a: 1 } }, q);
    expect(api.POST).toHaveBeenLastCalledWith('/api/v1/dashboards/builtins/{key}/underlying', {
      params: { path: { key: 'k' }, query: q },
      body: { params: { a: 1 } },
    });
  });

  it('loads field values, empty when the server sends none', async () => {
    api.GET.mockResolvedValue({ data: { options: { card: [{ value: 'c1', label: 'Card' }] } } });
    expect(await loadReportFieldValues('transactions')).toEqual({ success: true, data: { card: [{ value: 'c1', label: 'Card' }] } });
    api.GET.mockResolvedValue({ data: undefined });
    expect(await loadReportFieldValues('transactions')).toEqual({ success: true, data: {} });
  });

  it('runs an ad hoc report with the page query', async () => {
    api.POST.mockResolvedValue({ data: { type: 'KPI', value: 1 } });
    expect(await runAdHocReport(request, { page: 0, size: 5 })).toEqual({ success: true, data: { type: 'KPI', value: 1 } });
    expect(api.POST.mock.calls[0][0]).toBe('/api/v1/reports/data');
    expect(api.POST.mock.calls[0][1].params).toEqual({ query: { page: 0, size: 5 } });
  });

  it('creates and updates a report with a null description dropped', async () => {
    api.POST.mockResolvedValue({ data: { id: 'n' } });
    api.PUT.mockResolvedValue({ data: { id: 'u' } });
    const body = { name: 'R', description: null, type: 'KPI', datasource: 'transactions', definition: { measure: 'amount' } } as never;
    expect(await createReport(body)).toEqual({ success: true, data: { id: 'n' } });
    expect(api.POST.mock.calls[0][1].body.description).toBeUndefined();
    expect(await updateReport('u', body)).toEqual({ success: true, data: { id: 'u' } });
    expect(api.PUT.mock.calls[0][1].params).toEqual({ path: { id: 'u' } });
  });

  it('deletes a report', async () => {
    api.DELETE.mockResolvedValue({});
    expect(await deleteReport('r1')).toEqual({ success: true, data: null });
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/reports/{id}', { params: { path: { id: 'r1' } } });
  });

  it('duplicates a report as "<name> (copy)" with the same definition', async () => {
    api.GET.mockResolvedValue({ data: { name: 'Spend', description: 'd', type: 'KPI', datasource: 'transactions', definition: { m: 1 } } });
    api.POST.mockResolvedValue({ data: { id: 'copy' } });
    expect(await duplicateReportCopy('r1')).toEqual({ success: true, data: { id: 'copy' } });
    expect(api.POST.mock.calls[0][1].body).toEqual({ name: 'Spend (copy)', description: 'd', type: 'KPI', datasource: 'transactions', definition: { m: 1 } });
  });

  it('fails duplicating a report that is gone, and reports any API error as a failure', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect((await duplicateReportCopy('r1')).success).toBe(false);
    api.GET.mockRejectedValue(new Error('down'));
    expect((await loadRowBreakdown('d', 'r', 1)).success).toBe(false);
  });
});
