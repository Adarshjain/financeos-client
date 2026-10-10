// Hooks behind the investments & loans widgets, and the mutations that keep them fresh.

import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import { useOutstandingCounterparties } from '@/lib/query/hooks/useCounterparties';
import { usePortfolioSummary, useTaxHarvest } from '@/lib/query/hooks/useInvestments';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient } from '@/test/renderWithQuery';

function setup() {
  const qc = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, wrapper };
}

describe('investments & loans widget hooks', () => {
  beforeEach(() => vi.resetAllMocks());

  it('usePortfolioSummary reads /investments/summary under keys.investments.summary()', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { totalCurrentValue: 1 } } as never);
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => usePortfolioSummary(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/investments/summary');
    expect(qc.getQueryData(keys.investments.summary())).toEqual({ totalCurrentValue: 1 });
  });

  it('useTaxHarvest passes fy / page / size and keys by them under investments', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { fy: 2025 } } as never);
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => useTaxHarvest({ fy: 2025, page: 1, size: 3 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/investments/tax/harvest', { params: { query: { fy: 2025, page: 1, size: 3 } } });
    expect(qc.getQueryData(keys.investments.taxHarvest({ fy: 2025, page: 1, size: 3 }))).toEqual({ fy: 2025 });
  });

  it('every investments mutation (which invalidates keys.investments.all) refreshes both', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: {} } as never);
    const { qc, wrapper } = setup();
    renderHook(() => [usePortfolioSummary(), useTaxHarvest({ page: 0, size: 5 })], { wrapper });
    await waitFor(() => expect(api.GET).toHaveBeenCalledTimes(2));
    await qc.invalidateQueries({ queryKey: keys.investments.all });
    await waitFor(() => expect(api.GET).toHaveBeenCalledTimes(4));
  });

  it('useOutstandingCounterparties: nonzero balances sorted by |net|, one page', async () => {
    const page = { content: [], totalElements: 0 };
    vi.mocked(api.GET).mockResolvedValue({ data: page } as never);
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => useOutstandingCounterparties(5), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/counterparties', {
      params: { query: { page: 0, size: 5, outstanding: true, sort: ['net'] } },
    });
    expect(qc.getQueryData(keys.lendings.counterparties({ page: 0, size: 5, outstanding: true, sort: 'net' }))).toEqual(page);
  });

  it('useOutstandingCounterparties falls back to an empty page', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
    const { wrapper } = setup();
    const { result } = renderHook(() => useOutstandingCounterparties(5), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ content: [], totalElements: 0, size: 5 });
  });

  it('lending mutations (invalidateLendingQueries) refresh the outstanding balances', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [], totalElements: 0 } } as never);
    const { qc, wrapper } = setup();
    renderHook(() => useOutstandingCounterparties(5), { wrapper });
    await waitFor(() => expect(api.GET).toHaveBeenCalledTimes(1));
    await invalidateLendingQueries(qc);
    await waitFor(() => expect(api.GET).toHaveBeenCalledTimes(2));
  });
});
