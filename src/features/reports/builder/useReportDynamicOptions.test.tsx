import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatasourceCatalog } from '@/lib/reports.types';

import { useReportDynamicOptions } from './useReportDynamicOptions';

const load = vi.hoisted(() => vi.fn());
vi.mock('@/features/reports/reportActions', () => ({ loadReportFieldValues: load }));

const catalog = {
  fields: [
    { name: 'account', dynamic: true },
    { name: 'amount', dynamic: false },
  ],
} as unknown as DatasourceCatalog;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  load.mockReset();
  load.mockResolvedValue({ success: true, data: { account: [{ value: '7', label: 'HDFC' }] } });
});

describe('useReportDynamicOptions', () => {
  it('fetches nothing while no filter and no draft uses a dynamic field', () => {
    const { result } = renderHook(() => useReportDynamicOptions('transactions', catalog, [], 'amount'), { wrapper });
    expect(load).not.toHaveBeenCalled();
    expect(result.current).toEqual({});
  });

  it('loads a dynamic field’s values as soon as it is picked in the Add filter draft', async () => {
    const { result } = renderHook(() => useReportDynamicOptions('transactions', catalog, [], 'account'), { wrapper });
    await waitFor(() => expect(result.current.account).toEqual([{ id: '7', name: 'HDFC' }]));
    expect(load).toHaveBeenCalledWith('transactions');
  });
});
