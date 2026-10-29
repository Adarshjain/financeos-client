import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lendingActions', () => ({
  createLendingEntry: vi.fn(),
  updateLendingEntry: vi.fn(),
  deleteLendingEntry: vi.fn(),
  linkLendingEntryTransaction: vi.fn(),
  unlinkLendingEntryTransaction: vi.fn(),
  updateCounterparty: vi.fn(),
  deleteCounterparty: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { keys } from '@/lib/query/keys';
import type { CreateLendingRequest, UpdateLendingRequest } from '@/lib/types';

import {
  createLendingEntry,
  deleteCounterparty,
  deleteLendingEntry,
  linkLendingEntryTransaction,
  unlinkLendingEntryTransaction,
  updateCounterparty,
  updateLendingEntry,
} from './lendingActions';
import { useCounterpartyMutations } from './useCounterpartyMutations';

const ok = (data: unknown = undefined) => ({ success: true, data }) as never;

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

describe('useCounterpartyMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('linkTransaction PUTs {transactionId} and invalidates lendings + transactions', async () => {
    vi.mocked(linkLendingEntryTransaction).mockResolvedValue(ok({ id: 'l1' }));
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    result.current.linkTransaction.mutate({ id: 'l1', transactionId: 't1' });

    await waitFor(() => expect(result.current.linkTransaction.isSuccess).toBe(true));

    expect(linkLendingEntryTransaction).toHaveBeenCalledWith('l1', 't1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('unlinkTransaction removes the link and invalidates lendings + transactions', async () => {
    vi.mocked(unlinkLendingEntryTransaction).mockResolvedValue(ok());
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    result.current.unlinkTransaction.mutate('l1');

    await waitFor(() => expect(result.current.unlinkTransaction.isSuccess).toBe(true));

    expect(unlinkLendingEntryTransaction).toHaveBeenCalledWith('l1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('createLending still invalidates lendings + transactions', async () => {
    vi.mocked(createLendingEntry).mockResolvedValue(ok({ id: 'l2' }));
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    const body: CreateLendingRequest = {
      counterpartyId: 'cp1',
      direction: 'lent',
      amount: 500,
      entryDate: '2026-01-01',
    };
    result.current.createLending.mutate(body);

    await waitFor(() => expect(result.current.createLending.isSuccess).toBe(true));

    expect(createLendingEntry).toHaveBeenCalledWith(body);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('deleteLending still invalidates lendings + transactions', async () => {
    vi.mocked(deleteLendingEntry).mockResolvedValue(ok());
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    result.current.deleteLending.mutate('l3');

    await waitFor(() => expect(result.current.deleteLending.isSuccess).toBe(true));

    expect(deleteLendingEntry).toHaveBeenCalledWith('l3');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('updateLending invalidates lendings', async () => {
    vi.mocked(updateLendingEntry).mockResolvedValue(ok({ id: 'l4' }));
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    const body: UpdateLendingRequest = { amount: 750 };
    result.current.updateLending.mutate({ id: 'l4', body });

    await waitFor(() => expect(result.current.updateLending.isSuccess).toBe(true));

    expect(updateLendingEntry).toHaveBeenCalledWith('l4', body);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
  });
});

// The lent/borrowed/net cards on the Lendings Ledger page are cached under
// keys.loans.summary() (served by GET /loans/summary), which is not under the
// keys.lendings.all prefix — every ledger mutation must invalidate it too.
describe('useCounterpartyMutations — ledger totals (loans summary) invalidation', () => {
  type Mutations = ReturnType<typeof useCounterpartyMutations>;
  const resolve = (action: (...args: never[]) => unknown) => () =>
    vi.mocked(action as never as (...args: never[]) => Promise<never>).mockResolvedValue(ok({ id: 'x' }));

  const cases: Array<{ name: keyof Mutations; arrange: () => void; fire: (m: Mutations) => void }> = [
    { name: 'updateCp', arrange: resolve(updateCounterparty), fire: (m) => m.updateCp.mutate({ name: 'Rahul' }) },
    { name: 'deleteCp', arrange: resolve(deleteCounterparty), fire: (m) => m.deleteCp.mutate() },
    {
      name: 'createLending',
      arrange: resolve(createLendingEntry),
      fire: (m) =>
        m.createLending.mutate({ counterpartyId: 'cp1', direction: 'lent', amount: 500, entryDate: '2026-01-01' }),
    },
    { name: 'updateLending', arrange: resolve(updateLendingEntry), fire: (m) => m.updateLending.mutate({ id: 'l1', body: { amount: 600 } }) },
    { name: 'deleteLending', arrange: resolve(deleteLendingEntry), fire: (m) => m.deleteLending.mutate('l1') },
    { name: 'linkTransaction', arrange: resolve(linkLendingEntryTransaction), fire: (m) => m.linkTransaction.mutate({ id: 'l1', transactionId: 't1' }) },
    { name: 'unlinkTransaction', arrange: resolve(unlinkLendingEntryTransaction), fire: (m) => m.unlinkTransaction.mutate('l1') },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(cases)('$name invalidates keys.loans.summary() alongside keys.lendings.all', async ({ name, arrange, fire }) => {
    arrange();
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    fire(result.current);

    await waitFor(() => expect(result.current[name].isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.loans.summary() });
  });
});

describe('useCounterpartyMutations — error toasts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hands a failure and its fallback sentence to the caller instead of the Legacy toast', async () => {
    vi.mocked(deleteCounterparty).mockRejectedValue(new Error('boom'));
    const onError = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1', { onError }), { wrapper: Wrapper });

    result.current.deleteCp.mutate();

    await waitFor(() => expect(result.current.deleteCp.isError).toBe(true));
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "Couldn't delete counterparty. Try again.");
  });

  it('does the same for the link and unlink mutations', async () => {
    vi.mocked(linkLendingEntryTransaction).mockRejectedValue(new Error('no'));
    vi.mocked(unlinkLendingEntryTransaction).mockRejectedValue(new Error('no'));
    const onError = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1', { onError }), { wrapper: Wrapper });

    result.current.linkTransaction.mutate({ id: 'l1', transactionId: 't1' });
    result.current.unlinkTransaction.mutate('l1');

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2));
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "Couldn't link transaction. Try again.");
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "Couldn't unlink transaction. Try again.");
  });
});
