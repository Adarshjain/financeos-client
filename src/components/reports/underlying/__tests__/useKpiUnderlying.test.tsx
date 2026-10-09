import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { RunReportRequest } from '@/lib/reports.types';
import { createTestQueryClient } from '@/test/renderWithQuery';

import type { UnderlyingSource } from '../underlying.types';
import { fetchUnderlyingCsv, type UnderlyingQuery, useKpiUnderlying } from '../useKpiUnderlying';

const request: RunReportRequest = {
  type: 'KPI',
  datasource: 'transactions',
  definition: { measure: 'amount', aggregation: 'sum', filters: [] },
};
const saved: UnderlyingSource = { kind: 'saved', reportId: 'r1' };
const adhoc: UnderlyingSource = { kind: 'adhoc', request };
const builtin: UnderlyingSource = { kind: 'builtin', key: 'net_worth', params: { asOf: 'today' } };

const response = { period: 'current', rowCount: 0 };
const q: UnderlyingQuery = { period: 'current', page: 2, size: 25, sort: { key: 'date', direction: 'asc' } };

function wrapper() {
  const qc = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

describe('useKpiUnderlying', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: response } as never);
  });

  it('runs a saved KPI by id with period, page, size and sort', async () => {
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useKpiUnderlying(saved, q), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/{id}/underlying', {
      params: { path: { id: 'r1' }, query: { period: 'current', page: 2, size: 25, sort: 'date,asc' } },
    });
  });

  it('runs an ad-hoc KPI with its request as the body', async () => {
    const { Wrapper } = wrapper();
    renderHook(() => useKpiUnderlying(adhoc, { ...q, period: 'previous' }), { wrapper: Wrapper });
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/underlying', {
      params: { query: { period: 'previous', page: 2, size: 25, sort: 'date,asc' } },
      body: request,
    });
  });

  it('runs a built-in by key with its params as the body', async () => {
    const { Wrapper } = wrapper();
    renderHook(() => useKpiUnderlying(builtin, q), { wrapper: Wrapper });
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/builtins/{key}/underlying', {
      params: { path: { key: 'net_worth' }, query: { period: 'current', page: 2, size: 25, sort: 'date,asc' } },
      body: { params: { asOf: 'today' } },
    });
  });

  it('sends no sort and keys without one for the default order', async () => {
    const { qc, Wrapper } = wrapper();
    renderHook(() => useKpiUnderlying(saved, { ...q, sort: null }), { wrapper: Wrapper });
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(vi.mocked(api.POST).mock.calls[0][1]).toMatchObject({ params: { query: { sort: undefined } } });
    const key = keys.reports.underlying({ kind: 'saved', reportId: 'r1' }, { period: 'current', page: 2, size: 25 });
    await waitFor(() => expect(qc.getQueryData(key)).toEqual(response));
  });

  it('keys a sorted run by its sort param', async () => {
    const { qc, Wrapper } = wrapper();
    renderHook(() => useKpiUnderlying(saved, q), { wrapper: Wrapper });
    const key = keys.reports.underlying(
      { kind: 'saved', reportId: 'r1' },
      { period: 'current', page: 2, size: 25, sort: 'date,asc' },
    );
    await waitFor(() => expect(qc.getQueryData(key)).toEqual(response));
  });
});

describe('fetchUnderlyingCsv', () => {
  const blob = new Blob(['x']);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: blob } as never);
  });

  it('posts the saved CSV endpoint as a blob', async () => {
    await expect(fetchUnderlyingCsv(saved, { period: 'previous', sort: null })).resolves.toBe(blob);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/{id}/underlying/csv', {
      params: { path: { id: 'r1' }, query: { period: 'previous', sort: undefined } },
      parseAs: 'blob',
    });
  });

  it('posts the ad-hoc CSV endpoint with the request body', async () => {
    await fetchUnderlyingCsv(adhoc, { period: 'current', sort: { key: 'amount', direction: 'desc' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/underlying/csv', {
      params: { query: { period: 'current', sort: 'amount,desc' } },
      body: request,
      parseAs: 'blob',
    });
  });

  it('posts the built-in CSV endpoint with its params', async () => {
    await fetchUnderlyingCsv(builtin, { period: 'current', sort: null });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/builtins/{key}/underlying/csv', {
      params: { path: { key: 'net_worth' }, query: { period: 'current', sort: undefined } },
      body: { params: { asOf: 'today' } },
      parseAs: 'blob',
    });
  });
});
