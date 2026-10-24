import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KpiData, RunReportRequest } from '@/lib/reports.types';

import { useReportPreview } from './useReportPreview';

const api = vi.hoisted(() => ({ POST: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

const kpi = (value: number): KpiData => ({ type: 'KPI', value, measure: 'amount', aggregation: 'sum', comparison: null, meta: { rowCount: 1, dateRange: null } });
const request: RunReportRequest = { type: 'KPI', datasource: 'transactions', definition: { measure: 'amount', aggregation: 'sum', filters: [] } };
const table: RunReportRequest = { type: 'TABLE', datasource: 'transactions', definition: { mode: 'raw', columns: ['date'], filters: [] } };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => vi.clearAllMocks());

describe('useReportPreview', () => {
  it('starts on the run the server made, with nothing requested', () => {
    const { result } = renderHook(() => useReportPreview({ request, signature: 'a', valid: true, initial: { data: kpi(5), request, signature: 'a' } }));
    expect(result.current.shown?.data).toEqual(kpi(5));
    expect(result.current.stale).toBe(false);
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('is stale as soon as the draft’s signature differs from the shown run’s', () => {
    const { result, rerender } = renderHook(({ sig }) => useReportPreview({ request, signature: sig, valid: true, initial: { data: kpi(5), request, signature: 'a' } }), {
      initialProps: { sig: 'a' },
    });
    rerender({ sig: 'b' });
    expect(result.current.stale).toBe(true);
  });

  it('never lets a slower, older response replace a newer one', async () => {
    const slow = deferred<{ data: KpiData }>();
    const fast = deferred<{ data: KpiData }>();
    api.POST.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);
    const { result } = renderHook(() => useReportPreview({ request, signature: 'a', valid: true }));
    act(() => result.current.run());
    act(() => result.current.run());
    await act(async () => fast.resolve({ data: kpi(2) }));
    await act(async () => slow.resolve({ data: kpi(1) }));
    expect(result.current.shown?.data).toEqual(kpi(2));
    expect(result.current.loading).toBe(false);
  });

  it('sends page, size and sort for a table only, and a sort restarts at page 0', async () => {
    api.POST.mockResolvedValue({ data: { type: 'TABLE', mode: 'raw', columns: [], rows: [], page: { number: 0, size: 25, totalElements: 0, totalPages: 0 } } });
    const { result } = renderHook(() => useReportPreview({ request: table, signature: 't', valid: true }));
    await act(async () => result.current.run());
    expect(api.POST.mock.calls[0][1].params.query).toEqual({ page: 0, size: 50 });
    await act(async () => result.current.changeSize(25));
    expect(api.POST.mock.calls[1][1].params.query).toEqual({ page: 0, size: 25 });
    await act(async () => result.current.changeSort({ key: 'date', direction: 'desc' }));
    expect(api.POST.mock.calls[2][1].params.query).toEqual({ page: 0, size: 25, sort: 'date,desc' });
    await act(async () => result.current.changePage(2));
    expect(api.POST.mock.calls[3][1].params.query).toEqual({ page: 2, size: 25, sort: 'date,desc' });
  });

  it('sends no paging for a KPI or a chart', async () => {
    api.POST.mockResolvedValue({ data: kpi(1) });
    const { result } = renderHook(() => useReportPreview({ request, signature: 'a', valid: true }));
    await act(async () => result.current.run());
    expect(api.POST.mock.calls[0][1].params.query).toEqual({});
  });

  it('drops the sort and the page when the definition changed since the shown run', async () => {
    api.POST.mockResolvedValue({ data: { type: 'TABLE', mode: 'raw', columns: [], rows: [], page: { number: 0, size: 50, totalElements: 0, totalPages: 0 } } });
    const { result, rerender } = renderHook(({ sig }) => useReportPreview({ request: table, signature: sig, valid: true }), { initialProps: { sig: 't1' } });
    await act(async () => result.current.run());
    await act(async () => result.current.changeSort({ key: 'date', direction: 'asc' }));
    rerender({ sig: 't2' });
    await act(async () => result.current.run());
    expect(api.POST.mock.calls[2][1].params.query).toEqual({ page: 0, size: 50 });
  });

  it('keeps what was on screen and reports the failure when a run fails', async () => {
    api.POST.mockResolvedValueOnce({ data: kpi(1) }).mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useReportPreview({ request, signature: 'a', valid: true }));
    await act(async () => result.current.run());
    await act(async () => result.current.run());
    expect(result.current.error).toBe('Failed to run the report. Try again.');
    expect(result.current.shown?.data).toEqual(kpi(1));
  });

  it('pages a stale result by the definition it was run with, not the edited draft', async () => {
    const edited: RunReportRequest = { ...table, definition: { mode: 'raw', columns: ['date', 'amount'], filters: [] } };
    api.POST.mockResolvedValue({ data: { type: 'TABLE', mode: 'raw', columns: [], rows: [], page: { number: 0, size: 50, totalElements: 0, totalPages: 0 } } });
    const { result, rerender } = renderHook(({ req, sig }) => useReportPreview({ request: req, signature: sig, valid: true }), {
      initialProps: { req: table, sig: 't1' },
    });
    await act(async () => result.current.run());
    rerender({ req: edited, sig: 't2' });
    expect(result.current.stale).toBe(true);
    await act(async () => result.current.changePage(1));
    expect(api.POST.mock.calls[1][1].body.definition).toEqual(table.definition);
    expect(result.current.stale).toBe(true);
    await act(async () => result.current.run());
    expect(api.POST.mock.calls[2][1].body.definition).toEqual(edited.definition);
  });

  it('runs nothing while the draft has validation issues', async () => {
    const { result } = renderHook(() => useReportPreview({ request: table, signature: 't', valid: false, initial: { data: kpi(1), request: table, signature: 't' } }));
    await act(async () => {
      result.current.run();
      result.current.changePage(1);
      result.current.changeSize(10);
      result.current.changeSort({ key: 'date', direction: 'asc' });
    });
    expect(api.POST).not.toHaveBeenCalled();
  });
});
