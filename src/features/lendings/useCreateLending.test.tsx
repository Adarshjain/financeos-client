import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lendingActions', () => ({ createLendingEntry: vi.fn() }));
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

import { createLendingEntry } from './lendingActions';
import { useCreateLending } from './useCreateLending';

const body = { counterpartyId: 'c1', direction: 'lent', kind: 'principal', amount: 5, entryDate: '2026-10-13' } as const;

function setup(options?: Parameters<typeof useCreateLending>[0]) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { invalidate, ...renderHook(() => useCreateLending(options), { wrapper }) };
}

describe('useCreateLending', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POSTs the entry and refreshes lendings, loans summary, obligations and transactions', async () => {
    vi.mocked(createLendingEntry).mockResolvedValue({ success: true, data: { id: 'l1' } } as never);
    const { result, invalidate } = setup();
    result.current.mutate(body);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createLendingEntry).toHaveBeenCalledWith(body);
    const keysInvalidated = invalidate.mock.calls.map((c) => c[0]?.queryKey);
    expect(keysInvalidated).toEqual(
      expect.arrayContaining([keys.lendings.all, keys.loans.summary(), keys.obligations.all, keys.transactions.all]),
    );
  });

  it('shows the Legacy error toast by default', async () => {
    vi.mocked(createLendingEntry).mockRejectedValue(new Error('x'));
    const { result } = setup();
    result.current.mutate(body);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastError).toHaveBeenCalledWith(expect.any(Error), "Couldn't record lending. Try again.");
  });

  it('onError replaces the default toast', async () => {
    vi.mocked(createLendingEntry).mockRejectedValue(new Error('x'));
    const onError = vi.fn();
    const { result } = setup({ onError });
    result.current.mutate(body);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onError).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });
});
