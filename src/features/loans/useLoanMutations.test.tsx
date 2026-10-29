import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

const actions = vi.hoisted(() => ({
  addLoanPayment: vi.fn(),
  addLoanPaymentsBatch: vi.fn(),
  deleteLoanPayment: vi.fn(),
  addLoanEvent: vi.fn(),
  deleteLoanEvent: vi.fn(),
  addLoanCharge: vi.fn(),
  deleteLoanCharge: vi.fn(),
  closeLoan: vi.fn(),
  reopenLoan: vi.fn(),
  deleteLoan: vi.fn(),
}));
vi.mock('./actions', () => actions);
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
  Object.values(actions).forEach((fn) => fn.mockReset());
  toastError.mockReset();
});

describe('useLoanMutations', () => {
  it('records a payment and refreshes the loans and the transactions it can link', async () => {
    actions.addLoanPayment.mockResolvedValue({ success: true, data: { id: 'pay1' } });
    const { result, invalidate } = setup();
    let created: unknown;
    await act(async () => {
      created = await result.current.addPayment.mutateAsync({ installmentSeq: 3, paymentDate: '2026-10-05', amount: 100 });
    });
    expect(created).toEqual({ id: 'pay1' });
    expect(actions.addLoanPayment).toHaveBeenCalledWith('l1', { installmentSeq: 3, paymentDate: '2026-10-05', amount: 100 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.loans.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('closing refreshes the loans only', async () => {
    actions.closeLoan.mockResolvedValue({ success: true, data: undefined });
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.closeLoan.mutateAsync();
    });
    expect(actions.closeLoan).toHaveBeenCalledWith('l1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.loans.all });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('deletes a payment, an event, a charge and the loan', async () => {
    for (const fn of [actions.deleteLoanPayment, actions.deleteLoanEvent, actions.deleteLoanCharge, actions.deleteLoan]) {
      fn.mockResolvedValue({ success: true, data: undefined });
    }
    const { result } = setup();
    await act(async () => {
      await result.current.deletePayment.mutateAsync('p1');
      await result.current.deleteEvent.mutateAsync('e1');
      await result.current.deleteCharge.mutateAsync('c1');
      await result.current.deleteLoan.mutateAsync();
    });
    expect(actions.deleteLoanPayment).toHaveBeenCalledWith('l1', 'p1');
    expect(actions.deleteLoanEvent).toHaveBeenCalledWith('l1', 'e1');
    expect(actions.deleteLoanCharge).toHaveBeenCalledWith('l1', 'c1');
    expect(actions.deleteLoan).toHaveBeenCalledWith('l1');
  });

  it('uses the Legacy error toast by default', async () => {
    actions.addLoanEvent.mockRejectedValue(new Error('nope'));
    const { result } = setup();
    await act(async () => {
      await result.current.addEvent.mutateAsync({ eventType: 'prepayment', effectiveDate: '2026-10-05' }).catch(() => undefined);
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), "Couldn't add loan event. Try again."));
  });

  it('lets the page replace the error toast and gives it the fallback message', async () => {
    actions.deleteLoanEvent.mockRejectedValue(new Error('Cannot delete event: settled payment exists'));
    const onError = vi.fn();
    const { result } = setup({ onError });
    await act(async () => {
      await result.current.deleteEvent.mutateAsync('e1').catch(() => undefined);
    });
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.any(Error), "Couldn't delete loan event. Try again."));
    expect(toastError).not.toHaveBeenCalled();
  });
});
