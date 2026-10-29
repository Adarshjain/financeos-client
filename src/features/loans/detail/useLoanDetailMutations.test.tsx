import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchSuggestionsResponse } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';

import { installment } from './loanDetail.fixtures';
import { useLoanDetailMutations } from './useLoanDetailMutations';

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const m = vi.hoisted(() => ({
  addPayment: { mutateAsync: vi.fn(), isPending: false },
  addPaymentsBatch: { mutateAsync: vi.fn(), isPending: false },
  deletePayment: { mutateAsync: vi.fn(), isPending: false },
  addEvent: { mutateAsync: vi.fn(), isPending: false },
  deleteEvent: { mutateAsync: vi.fn(), isPending: false },
  addCharge: { mutateAsync: vi.fn(), isPending: false },
  deleteCharge: { mutateAsync: vi.fn(), isPending: false },
  closeLoan: { mutateAsync: vi.fn(), isPending: false },
  reopenLoan: { mutateAsync: vi.fn(), isPending: false },
  deleteLoan: { mutateAsync: vi.fn(), isPending: false },
}));
let onErrorOption: ((e: unknown, fallback: string) => void) | undefined;
vi.mock('@/features/loans/useLoanMutations', () => ({
  useLoanMutations: (_id: string, options?: { onError?: (e: unknown, fallback: string) => void }) => {
    onErrorOption = options?.onError;
    return m;
  },
}));

const loadLoanMatches = vi.hoisted(() => vi.fn());
vi.mock('./loanMatchActions', () => ({ loadLoanMatches }));

const tx = (id: string): Transaction =>
  ({ id, date: '2026-10-05', amount: -39052, description: 'SBI Home Loan EMI', accountId: 'b1' }) as Transaction;
const matches = (candidates: Transaction[]): MatchSuggestionsResponse => ({
  suggestions: [{ installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 36603, candidates }],
});

/** Runs the Undo action of the last toast. */
async function undoLast() {
  const options = toast.mock.calls.at(-1)?.[1] as { action: { label: string; onSelect: () => void } };
  expect(options.action.label).toBe('Undo');
  await act(async () => options.action.onSelect());
}

beforeEach(() => {
  vi.clearAllMocks();
  m.addPayment.mutateAsync.mockResolvedValue({ id: 'pay1' });
  for (const key of Object.keys(m) as (keyof typeof m)[]) {
    if (key !== 'addPayment') m[key].mutateAsync.mockResolvedValue({ created: 1 });
  }
});

const setup = () => renderHook(() => useLoanDetailMutations('l1')).result;

describe('mark paid', () => {
  it('records what was paid, says so, and Undo removes the payment', async () => {
    const actions = setup();
    let saved = false;
    await act(async () => {
      saved = await actions.current.markPaid(installment(14, '2026-10-05'), {
        amount: '39052',
        paymentDate: '2026-10-05',
        transactionId: 't1',
      });
    });
    expect(saved).toBe(true);
    expect(m.addPayment.mutateAsync).toHaveBeenCalledWith({
      installmentSeq: 14,
      paymentDate: '2026-10-05',
      amount: 39052,
      transactionId: 't1',
    });
    expect(toast).toHaveBeenCalledWith('Installment #14 marked as paid', expect.anything());
    expect(router.refresh).toHaveBeenCalled();

    await undoLast();
    expect(m.deletePayment.mutateAsync).toHaveBeenCalledWith('pay1');
  });

  it('reports a failure without a toast of its own (the mutation already showed the server message)', async () => {
    m.addPayment.mutateAsync.mockRejectedValue(new Error('no'));
    const actions = setup();
    let saved = true;
    await act(async () => {
      saved = await actions.current.markPaid(installment(14, '2026-10-05'), { amount: '1', paymentDate: '2026-10-05' });
    });
    expect(saved).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });

  it('shows the server message as a danger toast when a mutation fails', () => {
    setup();
    onErrorOption?.(new Error('x'), "Couldn't record loan payment. Try again.");
    expect(toast).toHaveBeenCalledWith("Couldn't record loan payment. Try again.", { tone: 'danger' });
  });
});

describe('unlink', () => {
  const paid = installment(13, '2026-09-05', {
    status: 'settled',
    payment: { id: 'p13', paymentDate: '2026-09-05', amount: 36603, transactionId: 't13' },
  });

  it('removes the payment, says so, and Undo records it again as it was', async () => {
    const actions = setup();
    await act(async () => {
      await actions.current.unlink(paid);
    });
    expect(m.deletePayment.mutateAsync).toHaveBeenCalledWith('p13');
    expect(toast).toHaveBeenCalledWith('Payment unlinked', expect.anything());

    await undoLast();
    expect(m.addPayment.mutateAsync).toHaveBeenCalledWith({
      installmentSeq: 13,
      paymentDate: '2026-09-05',
      amount: 36603,
      transactionId: 't13',
    });
  });

  it('does nothing for an EMI with no payment', async () => {
    const actions = setup();
    await act(async () => {
      expect(await actions.current.unlink(installment(14, '2026-10-05'))).toBe(false);
    });
    expect(m.deletePayment.mutateAsync).not.toHaveBeenCalled();
  });
});

describe('matching', () => {
  it('finds the debits and keeps them', async () => {
    loadLoanMatches.mockResolvedValue({ success: true, data: matches([tx('t1')]) });
    const actions = setup();
    await act(async () => actions.current.findMatches());
    expect(loadLoanMatches).toHaveBeenCalledWith('l1');
    expect(actions.current.matches?.suggestions[0].candidates).toHaveLength(1);
    expect(toast).not.toHaveBeenCalled();
    expect(actions.current.matchLoading).toBe(false);
  });

  it('says so when nothing matches', async () => {
    loadLoanMatches.mockResolvedValue({ success: true, data: matches([]) });
    const actions = setup();
    await act(async () => actions.current.findMatches());
    expect(toast).toHaveBeenCalledWith('No matching bank transactions (±7 days)');
  });

  it('reports a failed search', async () => {
    loadLoanMatches.mockResolvedValue({ success: false, error: { message: 'Server said no' } });
    const actions = setup();
    await act(async () => actions.current.findMatches());
    expect(toast).toHaveBeenCalledWith('Server said no', { tone: 'danger' });
    expect(actions.current.matches).toBeNull();
  });

  it('links one suggestion with Undo, then looks again', async () => {
    loadLoanMatches.mockResolvedValue({ success: true, data: matches([]) });
    const actions = setup();
    await act(async () => actions.current.linkMatch(14, '2026-10-05', 39052, 't1'));
    expect(m.addPayment.mutateAsync).toHaveBeenCalledWith({
      installmentSeq: 14,
      paymentDate: '2026-10-05',
      amount: 39052,
      transactionId: 't1',
    });
    expect(toast).toHaveBeenCalledWith('Matched installment #14', expect.anything());
    expect(loadLoanMatches).toHaveBeenCalled();
  });

  it('confirms every first candidate in one batch', async () => {
    loadLoanMatches.mockResolvedValue({ success: true, data: matches([tx('t1'), tx('t2')]) });
    m.addPaymentsBatch.mutateAsync.mockResolvedValue({ created: 1 });
    const actions = setup();
    await act(async () => actions.current.findMatches());
    await act(async () => actions.current.confirmAll());
    expect(m.addPaymentsBatch.mutateAsync).toHaveBeenCalledWith({
      items: [{ installmentSeq: 14, paymentDate: '2026-10-05', amount: 39052, transactionId: 't1' }],
    });
    expect(toast).toHaveBeenCalledWith('1 payment recorded');
  });

  it('confirm all does nothing before the debits were searched for', async () => {
    const actions = setup();
    await act(async () => actions.current.confirmAll());
    expect(m.addPaymentsBatch.mutateAsync).not.toHaveBeenCalled();
  });
});

describe('cached suggestions', () => {
  const found = async (actions: ReturnType<typeof setup>) => {
    loadLoanMatches.mockResolvedValue({ success: true, data: matches([tx('t1')]) });
    await act(async () => actions.current.findMatches());
    expect(actions.current.matches).not.toBeNull();
  };

  it('are cleared after marking paid, and after its Undo', async () => {
    const actions = setup();
    await found(actions);
    await act(async () => {
      await actions.current.markPaid(installment(14, '2026-10-05'), { amount: '1', paymentDate: '2026-10-05' });
    });
    expect(actions.current.matches).toBeNull();

    await found(actions);
    await undoLast();
    expect(actions.current.matches).toBeNull();
  });

  it('are cleared after unlinking, and after its Undo', async () => {
    const actions = setup();
    const paid = installment(13, '2026-09-05', {
      status: 'settled',
      payment: { id: 'p13', paymentDate: '2026-09-05', amount: 1, transactionId: 't13' },
    });
    await found(actions);
    await act(async () => {
      await actions.current.unlink(paid);
    });
    expect(actions.current.matches).toBeNull();

    await found(actions);
    await undoLast();
    expect(actions.current.matches).toBeNull();
  });

  it('are asked for again after a link', async () => {
    const actions = setup();
    await found(actions);
    loadLoanMatches.mockClear();
    await act(async () => actions.current.linkMatch(14, '2026-10-05', 39052, 't1'));
    expect(loadLoanMatches).toHaveBeenCalledTimes(1);
  });
});

describe('events and charges', () => {
  it('records an event and says so', async () => {
    const actions = setup();
    await act(async () => {
      await actions.current.addEvent({
        eventType: 'prepayment',
        effectiveDate: '2026-10-13',
        newAnnualRatePct: '',
        amount: '100000',
        adjustmentMode: 'reduce_tenure',
        newEmiOverride: '',
        transactionId: 't1',
      });
    });
    expect(m.addEvent.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'prepayment', amount: 100000, transactionId: 't1' }),
    );
    expect(toast).toHaveBeenCalledWith('Event recorded');
  });

  it('adds a charge and says so', async () => {
    const actions = setup();
    await act(async () => {
      await actions.current.addCharge({ chargeType: 'late_fee', amount: '500', chargeDate: '2026-10-05', notes: '' });
    });
    expect(m.addCharge.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ chargeType: 'late_fee', amount: 500 }));
    expect(toast).toHaveBeenCalledWith('Charge added');
  });

  it('deletes an event and a charge', async () => {
    const actions = setup();
    await act(async () => {
      expect(await actions.current.deleteEvent('e1')).toBe(true);
      expect(await actions.current.deleteCharge('c1')).toBe(true);
    });
    expect(m.deleteEvent.mutateAsync).toHaveBeenCalledWith('e1');
    expect(m.deleteCharge.mutateAsync).toHaveBeenCalledWith('c1');
    expect(toast).toHaveBeenCalledWith('Event deleted');
    expect(toast).toHaveBeenCalledWith('Charge deleted');
  });

  it('keeps the server error for an event delete the schedule does not allow', async () => {
    m.deleteEvent.mutateAsync.mockRejectedValue(new Error('Cannot delete event: settled payment exists'));
    const actions = setup();
    await act(async () => {
      expect(await actions.current.deleteEvent('e1')).toBe(false);
    });
    expect(toast).not.toHaveBeenCalledWith('Event deleted');
  });
});

describe('the loan itself', () => {
  it('closes with Undo that reopens', async () => {
    const actions = setup();
    await act(async () => actions.current.closeLoan());
    expect(m.closeLoan.mutateAsync).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Loan closed', expect.anything());
    await undoLast();
    expect(m.reopenLoan.mutateAsync).toHaveBeenCalled();
  });

  it('reopens with Undo that closes', async () => {
    const actions = setup();
    await act(async () => actions.current.reopenLoan());
    expect(toast).toHaveBeenCalledWith('Loan reopened', expect.anything());
    await undoLast();
    expect(m.closeLoan.mutateAsync).toHaveBeenCalled();
  });

  it('deletes and goes back to the loans list', async () => {
    const actions = setup();
    await act(async () => {
      expect(await actions.current.deleteLoan()).toBe(true);
    });
    expect(m.deleteLoan.mutateAsync).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Loan deleted');
    expect(router.push).toHaveBeenCalledWith('/loans');
  });

  it('stays on the page when the delete fails', async () => {
    m.deleteLoan.mutateAsync.mockRejectedValue(new Error('no'));
    const actions = setup();
    await act(async () => {
      expect(await actions.current.deleteLoan()).toBe(false);
    });
    expect(router.push).not.toHaveBeenCalled();
  });
});
