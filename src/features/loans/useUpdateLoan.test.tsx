import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

const api = vi.hoisted(() => ({ PUT: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api }));
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
  api.PUT.mockReset();
  toastError.mockReset();
});

describe('useUpdateLoan', () => {
  it('puts the loan and refreshes every loan query', async () => {
    api.PUT.mockResolvedValue({ data: { id: 'l1' } });
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.mutateAsync({ id: 'l1', body: { name: 'x' } });
    });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/loans/{id}', { params: { path: { id: 'l1' } }, body: { name: 'x' } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.loans.all });
  });

  it('uses the Legacy error toast by default, and lets the caller replace it', async () => {
    api.PUT.mockRejectedValue(new Error('nope'));
    const first = setup();
    await act(async () => {
      await first.result.current.mutateAsync({ id: 'l1', body: {} }).catch(() => undefined);
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to update loan'));

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
