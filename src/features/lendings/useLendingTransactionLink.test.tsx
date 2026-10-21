import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

const api = vi.hoisted(() => ({ PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api }));
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
  api.PUT.mockReset();
  api.DELETE.mockReset();
  toastError.mockReset();
});

describe('useLinkLendingTransaction', () => {
  it('puts the transaction on the entry and refreshes lendings and transactions', async () => {
    api.PUT.mockResolvedValue({ data: { id: 'l1' } });
    const { result, invalidate } = setup(() => useLinkLendingTransaction());
    await act(async () => {
      await result.current.mutateAsync({ id: 'l1', transactionId: 't1' });
    });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', { params: { path: { id: 'l1' } }, body: { transactionId: 't1' } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('uses the Legacy error toast unless the caller replaces it', async () => {
    api.PUT.mockRejectedValue(new Error('nope'));
    const first = setup(() => useLinkLendingTransaction());
    await act(async () => {
      await first.result.current.mutateAsync({ id: 'l1', transactionId: 't1' }).catch(() => undefined);
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to link transaction'));

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
    api.DELETE.mockResolvedValue({});
    const { result, invalidate } = setup(() => useUnlinkLendingTransaction());
    await act(async () => {
      await result.current.mutateAsync('l1');
    });
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', { params: { path: { id: 'l1' } } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('uses the Legacy error toast by default', async () => {
    api.DELETE.mockRejectedValue(new Error('nope'));
    const { result } = setup(() => useUnlinkLendingTransaction());
    await act(async () => {
      await result.current.mutateAsync('l1').catch(() => undefined);
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to unlink transaction'));
  });
});
