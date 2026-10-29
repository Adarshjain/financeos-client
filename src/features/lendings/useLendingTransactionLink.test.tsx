import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

const actions = vi.hoisted(() => ({ linkLendingEntryTransaction: vi.fn(), unlinkLendingEntryTransaction: vi.fn() }));
vi.mock('./lendingActions', () => actions);
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toastError', () => ({ toastError }));

import { useLinkLendingTransaction, useUnlinkLendingTransaction } from './useLendingTransactionLink';

function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(hook, { wrapper }), invalidate };
}

beforeEach(() => {
  actions.linkLendingEntryTransaction.mockReset();
  actions.unlinkLendingEntryTransaction.mockReset();
  toastError.mockReset();
});

describe('useLinkLendingTransaction', () => {
  it('puts the transaction on the entry and refreshes lendings and transactions', async () => {
    actions.linkLendingEntryTransaction.mockResolvedValue({ success: true, data: { id: 'l1' } });
    const { result, invalidate } = setup(() => useLinkLendingTransaction());
    await act(async () => {
      await result.current.mutateAsync({ id: 'l1', transactionId: 't1' });
    });
    expect(actions.linkLendingEntryTransaction).toHaveBeenCalledWith('l1', 't1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('uses the Legacy error toast unless the caller replaces it', async () => {
    actions.linkLendingEntryTransaction.mockRejectedValue(new Error('nope'));
    const first = setup(() => useLinkLendingTransaction());
    await act(async () => {
      await first.result.current.mutateAsync({ id: 'l1', transactionId: 't1' }).catch(() => undefined);
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), "Couldn't link transaction. Try again."));

    const onError = vi.fn();
    const second = setup(() => useLinkLendingTransaction({ onError }));
    await act(async () => {
      await second.result.current.mutateAsync({ id: 'l1', transactionId: 't1' }).catch(() => undefined);
    });
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});

describe('useUnlinkLendingTransaction', () => {
  it('detaches the transaction and refreshes lendings and transactions', async () => {
    actions.unlinkLendingEntryTransaction.mockResolvedValue({ success: true, data: undefined });
    const { result, invalidate } = setup(() => useUnlinkLendingTransaction());
    await act(async () => {
      await result.current.mutateAsync('l1');
    });
    expect(actions.unlinkLendingEntryTransaction).toHaveBeenCalledWith('l1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('uses the Legacy error toast by default', async () => {
    actions.unlinkLendingEntryTransaction.mockRejectedValue(new Error('nope'));
    const { result } = setup(() => useUnlinkLendingTransaction());
    await act(async () => {
      await result.current.mutateAsync('l1').catch(() => undefined);
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), "Couldn't unlink transaction. Try again."));
  });
});
