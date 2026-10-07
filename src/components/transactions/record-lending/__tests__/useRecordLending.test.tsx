import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

import { useRecordLending } from '../useRecordLending';

const debitTx: Transaction = {
  id: 'tx-1',
  accountId: 'acc1',
  date: '2026-05-01',
  amount: -1200,
  source: 'manual',
  createdAt: '2026-05-01T00:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, invalidateSpy };
}

// Recording a lending from the transaction Link dialog changes the lent /
// borrowed / net totals on the Lendings Ledger page, which are cached under
// keys.loans.summary() — not under the keys.lendings.all prefix.
describe('useRecordLending — ledger totals (loans summary) invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [] } } as never);
  });

  it('recording a new entry invalidates lendings, transactions and the loans summary, then closes', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'l1' } } as never);
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(
      () => useRecordLending({ transaction: debitTx, open: true, onOpenChange, onSuccess }),
      { wrapper: Wrapper },
    );

    act(() => result.current.setSelectedCpId('cp1'));
    await waitFor(() => expect(result.current.canSubmitNew).toBe(true));

    act(() => result.current.handleSubmitNew());

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.POST).toHaveBeenCalledWith('/api/v1/lendings', {
      body: expect.objectContaining({ counterpartyId: 'cp1', transactionId: 'tx-1', direction: 'lent' }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.loans.summary() });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('attaching to an existing entry invalidates lendings, transactions and the loans summary, then closes', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: { id: 'l1' } } as never);
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(
      () => useRecordLending({ transaction: debitTx, open: true, onOpenChange, onSuccess }),
      { wrapper: Wrapper },
    );

    act(() => result.current.handleAttach('l1'));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: 'l1' } },
      body: { transactionId: 'tx-1' },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.loans.summary() });
    expect(onSuccess).toHaveBeenCalled();
  });
});
