import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
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
import type { CreateLendingRequest, UpdateLendingRequest } from '@/lib/types';

import { useCounterpartyMutations } from '../useCounterpartyMutations';

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
    vi.mocked(api.PUT).mockResolvedValue({ data: { id: 'l1' } } as never);
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    result.current.linkTransaction.mutate({ id: 'l1', transactionId: 't1' });

    await waitFor(() => expect(result.current.linkTransaction.isSuccess).toBe(true));

    expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: 'l1' } },
      body: { transactionId: 't1' },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('unlinkTransaction DELETEs the link and invalidates lendings + transactions', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: null } as never);
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    result.current.unlinkTransaction.mutate('l1');

    await waitFor(() => expect(result.current.unlinkTransaction.isSuccess).toBe(true));

    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: 'l1' } },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('createLending still invalidates lendings + transactions', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'l2' } } as never);
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

    expect(api.POST).toHaveBeenCalledWith('/api/v1/lendings', { body });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('deleteLending still invalidates lendings + transactions', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: null } as never);
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    result.current.deleteLending.mutate('l3');

    await waitFor(() => expect(result.current.deleteLending.isSuccess).toBe(true));

    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/lendings/{id}', {
      params: { path: { id: 'l3' } },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('updateLending invalidates lendings', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: { id: 'l4' } } as never);
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCounterpartyMutations('cp1'), { wrapper: Wrapper });

    const body: UpdateLendingRequest = { amount: 750 };
    result.current.updateLending.mutate({ id: 'l4', body });

    await waitFor(() => expect(result.current.updateLending.isSuccess).toBe(true));

    expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}', {
      params: { path: { id: 'l4' } },
      body,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
  });
});

// The lent/borrowed/net cards on the Lendings Ledger page are cached under
// keys.loans.summary() (served by GET /loans/summary), which is not under the
// keys.lendings.all prefix — every ledger mutation must invalidate it too.
describe('useCounterpartyMutations — ledger totals (loans summary) invalidation', () => {
  type Mutations = ReturnType<typeof useCounterpartyMutations>;
  const resolvePut = () => vi.mocked(api.PUT).mockResolvedValue({ data: { id: 'x' } } as never);
  const resolvePost = () => vi.mocked(api.POST).mockResolvedValue({ data: { id: 'x' } } as never);
  const resolveDelete = () => vi.mocked(api.DELETE).mockResolvedValue({ data: null } as never);

  const cases: Array<{ name: keyof Mutations; arrange: () => void; fire: (m: Mutations) => void }> = [
    { name: 'updateCp', arrange: resolvePut, fire: (m) => m.updateCp.mutate({ name: 'Rahul' }) },
    { name: 'deleteCp', arrange: resolveDelete, fire: (m) => m.deleteCp.mutate() },
    {
      name: 'createLending',
      arrange: resolvePost,
      fire: (m) =>
        m.createLending.mutate({ counterpartyId: 'cp1', direction: 'lent', amount: 500, entryDate: '2026-01-01' }),
    },
    { name: 'updateLending', arrange: resolvePut, fire: (m) => m.updateLending.mutate({ id: 'l1', body: { amount: 600 } }) },
    { name: 'deleteLending', arrange: resolveDelete, fire: (m) => m.deleteLending.mutate('l1') },
    { name: 'linkTransaction', arrange: resolvePut, fire: (m) => m.linkTransaction.mutate({ id: 'l1', transactionId: 't1' }) },
    { name: 'unlinkTransaction', arrange: resolveDelete, fire: (m) => m.unlinkTransaction.mutate('l1') },
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
