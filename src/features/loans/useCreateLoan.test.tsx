import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

const actions = vi.hoisted(() => ({ createLoan: vi.fn() }));
vi.mock('./actions', () => actions);
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toastError', () => ({ toastError }));

import { useCreateLoan } from './useCreateLoan';

function setup(options?: Parameters<typeof useCreateLoan>[0]) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useCreateLoan(options), { wrapper }), invalidate };
}

beforeEach(() => {
  actions.createLoan.mockReset();
  toastError.mockReset();
});

describe('useCreateLoan', () => {
  it('posts the loan and refreshes every loan query', async () => {
    actions.createLoan.mockResolvedValue({ success: true, data: { id: 'l1' } });
    const { result, invalidate } = setup();
    let created: unknown;
    await act(async () => {
      created = await result.current.mutateAsync({ name: 'x' } as never);
    });
    expect(created).toEqual({ id: 'l1' });
    expect(actions.createLoan).toHaveBeenCalledWith({ name: 'x' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.loans.all });
  });

  it('uses the Legacy error toast by default', async () => {
    actions.createLoan.mockRejectedValue(new Error('nope'));
    const { result } = setup();
    await act(async () => {
      await result.current.mutateAsync({} as never).catch(() => undefined);
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), "Couldn't create loan. Try again."));
  });

  it('lets the caller replace the error toast', async () => {
    actions.createLoan.mockRejectedValue(new Error('nope'));
    const onError = vi.fn();
    const { result } = setup({ onError });
    await act(async () => {
      await result.current.mutateAsync({} as never).catch(() => undefined);
    });
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
  });
});
