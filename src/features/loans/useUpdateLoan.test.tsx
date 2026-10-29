import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

const actions = vi.hoisted(() => ({ updateLoan: vi.fn() }));
vi.mock('./actions', () => actions);
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toastError', () => ({ toastError }));

import { useUpdateLoan } from './useUpdateLoan';

function setup(options?: Parameters<typeof useUpdateLoan>[0]) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useUpdateLoan(options), { wrapper }), invalidate };
}

beforeEach(() => {
  actions.updateLoan.mockReset();
  toastError.mockReset();
});

describe('useUpdateLoan', () => {
  it('puts the loan and refreshes every loan query', async () => {
    actions.updateLoan.mockResolvedValue({ success: true, data: { id: 'l1' } });
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.mutateAsync({ id: 'l1', body: { name: 'x' } });
    });
    expect(actions.updateLoan).toHaveBeenCalledWith('l1', { name: 'x' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.loans.all });
  });

  it('uses the Legacy error toast by default, and lets the caller replace it', async () => {
    actions.updateLoan.mockRejectedValue(new Error('nope'));
    const first = setup();
    await act(async () => {
      await first.result.current.mutateAsync({ id: 'l1', body: {} }).catch(() => undefined);
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), "Couldn't update loan. Try again."));

    toastError.mockReset();
    const onError = vi.fn();
    const second = setup({ onError });
    await act(async () => {
      await second.result.current.mutateAsync({ id: 'l1', body: {} }).catch(() => undefined);
    });
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
  });
});
