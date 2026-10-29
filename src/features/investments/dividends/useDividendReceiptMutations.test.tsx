import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDividendReceiptMutations } from './useDividendReceiptMutations';

const api = vi.hoisted(() => ({ PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...renderHook(() => useDividendReceiptMutations(), { wrapper }), invalidate };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.PUT.mockResolvedValue({ data: { id: 'd1' } });
  api.DELETE.mockResolvedValue({});
});

describe('useDividendReceiptMutations', () => {
  it('links a bank credit without touching the TDS unless told to', async () => {
    const { result } = setup();
    await act(() => result.current.link.mutateAsync({ id: 'd1', transactionId: 't1' }));
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: 'd1' } },
      body: { transactionId: 't1', updateTds: false },
    });
  });

  it('unlinks the bank credit', async () => {
    const { result } = setup();
    await act(() => result.current.unlink.mutateAsync('d1'));
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', { params: { path: { id: 'd1' } } });
  });

  it('sends a note, and null for "derived automatically"', async () => {
    const { result } = setup();
    await act(() => result.current.setNote.mutateAsync({ id: 'd1', note: 'not_received' }));
    expect(api.PUT).toHaveBeenLastCalledWith('/api/v1/investments/dividends/{id}/receipt-status', {
      params: { path: { id: 'd1' } },
      body: { status: 'not_received' },
    });
    await act(() => result.current.setNote.mutateAsync({ id: 'd1', note: 'derived' }));
    expect(api.PUT).toHaveBeenLastCalledWith('/api/v1/investments/dividends/{id}/receipt-status', {
      params: { path: { id: 'd1' } },
      body: { status: null },
    });
  });

  it('refreshes the investment and the transaction queries', async () => {
    const { result, invalidate } = setup();
    await act(() => result.current.refresh());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidate.mock.calls.length).toBeGreaterThan(1);
  });

  it('is not busy while idle', () => {
    expect(setup().result.current.busy).toBe(false);
  });
});
