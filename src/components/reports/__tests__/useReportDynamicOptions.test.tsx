import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import type { DatasourceCatalog, FilterClause } from '@/lib/reports.types';

import { useReportDynamicOptions } from '../useReportDynamicOptions';

const catalog: DatasourceCatalog = {
  fields: [
    { name: 'rule', label: 'Rule', type: 'enum', role: 'dimension', dynamic: true, allowedInReports: ['CHART'] },
    { name: 'reason', label: 'Reason', type: 'enum', role: 'dimension', values: ['MATCHED'], allowedInReports: ['CHART'] },
    { name: 'effectiveDate', label: 'Effective Date', type: 'date', role: 'dimension', allowedInReports: ['CHART'] },
  ],
  operators: {
    date: { absolute: ['between'], relative: ['this_month'] },
    string: ['exact'],
    number: ['equals'],
    enum: ['is', 'in'],
    boolean: ['is'],
  },
} as DatasourceCatalog;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const ruleFilter: FilterClause = { field: 'rule', operator: 'is', value: 'Base 1%' } as FilterClause;

describe('useReportDynamicOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({
      data: { values: { rule: ['Base 1%', 'Weekend bonus'], card: ['HDFC Regalia'] } },
    } as never);
  });

  it('does not fetch while no filter uses a dynamic field', async () => {
    const filters = [
      { field: 'reason', operator: 'is', value: 'MATCHED' },
      { field: 'effectiveDate', operator: 'this_month' },
    ] as FilterClause[];
    const { result } = renderHook(() => useReportDynamicOptions('reward_earnings', catalog, filters), {
      wrapper: createWrapper(),
    });
    await Promise.resolve();
    expect(api.GET).not.toHaveBeenCalled();
    expect(result.current).toEqual({});
  });

  it('fetches the datasource values once a filter uses a dynamic field and maps them to options', async () => {
    const { result } = renderHook(() => useReportDynamicOptions('reward_earnings', catalog, [ruleFilter]), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.rule).toBeDefined());
    expect(api.GET).toHaveBeenCalledWith('/api/v1/report/datasource/{name}/values', {
      params: { path: { name: 'reward_earnings' } },
    });
    expect(result.current.rule).toEqual([
      { id: 'Base 1%', name: 'Base 1%' },
      { id: 'Weekend bonus', name: 'Weekend bonus' },
    ]);
    expect(result.current.card).toEqual([{ id: 'HDFC Regalia', name: 'HDFC Regalia' }]);
  });

  it('refetches for a different datasource', async () => {
    const { result, rerender } = renderHook(
      ({ ds }: { ds: string }) => useReportDynamicOptions(ds, catalog, [ruleFilter]),
      { wrapper: createWrapper(), initialProps: { ds: 'reward_earnings' } },
    );
    await waitFor(() => expect(result.current.rule).toBeDefined());
    rerender({ ds: 'reward_caps' });
    await waitFor(() => expect(api.GET).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.GET).mock.calls[1][1]).toEqual({ params: { path: { name: 'reward_caps' } } });
  });

  it('treats a response without values as no loaded fields', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
    const { result } = renderHook(() => useReportDynamicOptions('reward_earnings', catalog, [ruleFilter]), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(result.current).toEqual({});
  });
});
