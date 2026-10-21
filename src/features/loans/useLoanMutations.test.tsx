import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

const api = vi.hoisted(() => ({ POST: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toastError', () => ({ toastError }));

import { useLoanMutations } from './useLoanMutations';

function setup(options?: Parameters<typeof useLoanMutations>[1]) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useLoanMutations('l1', options), { wrapper }), invalidate };
}

beforeEach(() => {
  api.POST.mockReset();
  api.DELETE.mockReset();
  toastError.mockReset();
});

describe('useLoanMutations', () => {
  it('records a payment and refreshes the loans and the transactions it can link', async () => {
    api.POST.mockResolvedValue({ data: { id: 'pay1' } });
    const { result, invalidate } = setup();
    let created: unknown;
    await act(async () => {
      created = await result.current.addPayment.mutateAsync({ installmentSeq: 3, paymentDate: '2026-10-05', amount: 100 });
    });
    expect(created).toEqual({ id: 'pay1' });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/payments', {
      params: { path: { id: 'l1' } },
      body: { installmentSeq: 3, paymentDate: '2026-10-05', amount: 100 },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.loans.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('closing refreshes the loans only', async () => {
    api.POST.mockResolvedValue({});
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.closeLoan.mutateAsync();
    });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/loans/{id}/close', { params: { path: { id: 'l1' } } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.loans.all });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('deletes a payment, an event, a charge and the loan', async () => {
    api.DELETE.mockResolvedValue({});
    const { result } = setup();
    await act(async () => {
      await result.current.deletePayment.mutateAsync('p1');
      await result.current.deleteEvent.mutateAsync('e1');
      await result.current.deleteCharge.mutateAsync('c1');
      await result.current.deleteLoan.mutateAsync();
    });
    expect(api.DELETE.mock.calls.map((c) => c[0])).toEqual([
      '/api/v1/loans/{id}/payments/{paymentId}',
      '/api/v1/loans/{id}/events/{eventId}',
      '/api/v1/loans/{id}/charges/{chargeId}',
      '/api/v1/loans/{id}',
    ]);
  });

  it('uses the Legacy error toast by default', async () => {
    api.POST.mockRejectedValue(new Error('nope'));
    const { result } = setup();
    await act(async () => {
      await result.current.addEvent.mutateAsync({ eventType: 'prepayment', effectiveDate: '2026-10-05' }).catch(() => undefined);
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to add loan event'));
  });

  it('lets the page replace the error toast and gives it the fallback message', async () => {
    api.DELETE.mockRejectedValue(new Error('Cannot delete event: settled payment exists'));
    const onError = vi.fn();
    const { result } = setup({ onError });
    await act(async () => {
      await result.current.deleteEvent.mutateAsync('e1').catch(() => undefined);
    });
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.any(Error), 'Failed to delete loan event'));
    expect(toastError).not.toHaveBeenCalled();
  });
});
