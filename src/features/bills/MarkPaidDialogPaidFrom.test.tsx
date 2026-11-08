import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { PaymentCandidateResponse } from '@/lib/api/types';
import { AccountType } from '@/lib/types';

import { MarkPaidDialog } from './MarkPaidDialog';

const user = userEvent.setup({ pointerEventsCheck: 0, advanceTimers: (ms) => vi.advanceTimersByTime(ms) });

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const markPaid = vi.fn();
let pending = false;
vi.mock('@/lib/query/hooks/useBills', () => ({
  useBillMutations: () => ({
    markPaid: { mutateAsync: markPaid, isPending: pending },
    unmarkPaid: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

let candidates: PaymentCandidateResponse[] = [];
let updatedAt = Number.MAX_SAFE_INTEGER;
const lookups: Array<{ amount: number | null; enabled: boolean }> = [];
vi.mock('@/lib/query/hooks/usePaymentCandidates', () => ({
  usePaymentCandidates: (_id: string, amount: number | null, enabled: boolean) => {
    lookups.push({ amount, enabled });
    // Like the real query: a disabled one keeps what it last fetched.
    return { data: candidates, dataUpdatedAt: updatedAt };
  },
}));

const accounts = [
  { id: 'bank1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
  { id: 'gen1', name: 'Wallet', type: AccountType.GENERIC },
  { id: 'old1', name: 'Old Bank', type: AccountType.BANK_ACCOUNT, closedOn: '2020-01-01' },
  { id: 'cc1', name: 'Some Card', type: AccountType.CREDIT_CARD },
  { id: 'br1', name: 'Zerodha', type: AccountType.BROKER },
];
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: accounts }) }));

vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-13' }));

const cand = (n: number, over: Partial<PaymentCandidateResponse> = {}): PaymentCandidateResponse => ({
  transactionId: `t${n}`,
  accountId: 'bank1',
  accountName: 'HDFC Savings',
  date: '2026-10-10',
  amount: 44319,
  description: `UPI to card ${n}`,
  payeeSignal: true,
  ...over,
});

const renderDialog = () =>
  render(<MarkPaidDialog open onOpenChange={vi.fn()} statementId="s1" cardName="HDFC Regalia" remaining={44319} />);
const paidFrom = () => screen.getByRole('combobox', { name: /Paid from/ });
const pick = async (name: RegExp | string) => {
  await user.click(paidFrom());
  await user.click(await screen.findByRole('option', { name }));
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Mark paid' }));

describe('MarkPaidDialog paid from', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    candidates = [];
    updatedAt = Number.MAX_SAFE_INTEGER;
    pending = false;
    lookups.length = 0;
    markPaid.mockResolvedValue({});
  });
  afterEach(() => vi.useRealTimers());

  it('defaults to Dont add a transaction with no candidate and sends no payment', async () => {
    renderDialog();
    expect(paidFrom()).toHaveTextContent("Don't add a transaction");
    submit();
    await waitFor(() => expect(markPaid).toHaveBeenCalledWith({ statementId: 's1', body: { paidOn: '2026-10-13' } }));
  });

  it('defaults to Dont add a transaction with several candidates', () => {
    candidates = [cand(1), cand(2)];
    renderDialog();
    expect(paidFrom()).toHaveTextContent("Don't add a transaction");
  });

  it('lists candidates first, then open bank and generic accounts, the outside account, then none', async () => {
    candidates = [cand(1), cand(2, { accountName: 'ICICI' })];
    renderDialog();
    await user.click(paidFrom());
    const labels = (await screen.findAllByRole('option')).map((o) => o.textContent ?? '');
    expect(labels).toHaveLength(6);
    expect(labels[0]).toContain('HDFC Savings · 10 Oct · ₹44,319.00');
    expect(labels[0]).toContain('UPI to card 1');
    expect(labels[1]).toContain('ICICI · 10 Oct');
    expect(labels[2]).toContain('HDFC Savings');
    expect(labels[2]).toContain('Creates the bank payment too');
    expect(labels[3]).toContain('Wallet');
    expect(labels[4]).toContain('An account not in FinanceOS');
    expect(labels[5]).toBe("Don't add a transaction");
    expect(labels.join('|')).not.toMatch(/Old Bank|Some Card|Zerodha/);
  });

  it('preselects exactly one candidate, locks amount and date, and sends EXISTING', async () => {
    candidates = [cand(1, { date: '2026-10-09', amount: 44319 })];
    renderDialog();
    expect(paidFrom()).toHaveTextContent('HDFC Savings · 9 Oct');
    expect(screen.getByLabelText('Amount paid')).toBeDisabled();
    expect(screen.getByLabelText('Amount paid')).toHaveValue('44319');
    expect(screen.getByLabelText('Paid on')).toBeDisabled();
    expect(screen.getByLabelText('Paid on')).toHaveValue('09/10/2026');
    submit();
    await waitFor(() =>
      expect(markPaid).toHaveBeenCalledWith({
        statementId: 's1',
        body: { payment: { mode: 'EXISTING', fromTransactionId: 't1' } },
      }),
    );
  });

  it('picking Dont add on a preselected debit unlocks the fields and sends a plain mark', async () => {
    candidates = [cand(1)];
    renderDialog();
    await pick("Don't add a transaction");
    expect(screen.getByLabelText('Paid on')).toBeEnabled();
    submit();
    await waitFor(() => expect(markPaid).toHaveBeenCalledWith({ statementId: 's1', body: { paidOn: '2026-10-13' } }));
  });

  it('picking one of several candidates sends EXISTING for it', async () => {
    candidates = [cand(1), cand(2)];
    renderDialog();
    await pick(/UPI to card 2/);
    submit();
    await waitFor(() =>
      expect(markPaid).toHaveBeenCalledWith({
        statementId: 's1',
        body: { payment: { mode: 'EXISTING', fromTransactionId: 't2' } },
      }),
    );
  });

  it('a bank account sends NEW with that account, the paid date and no amount in full', async () => {
    renderDialog();
    await pick(/^Wallet/);
    submit();
    await waitFor(() =>
      expect(markPaid).toHaveBeenCalledWith({
        statementId: 's1',
        body: { paidOn: '2026-10-13', payment: { mode: 'NEW', fromAccountId: 'gen1' } },
      }),
    );
  });

  it('an account not in FinanceOS sends NEW without an account', async () => {
    renderDialog();
    await pick(/An account not in FinanceOS/);
    submit();
    await waitFor(() =>
      expect(markPaid).toHaveBeenCalledWith({
        statementId: 's1',
        body: { paidOn: '2026-10-13', payment: { mode: 'NEW' } },
      }),
    );
  });

  it('a part payment to a bank account sends the amount with NEW', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('radio', { name: 'Part payment' }));
    fireEvent.change(screen.getByLabelText('Amount paid'), { target: { value: '500' } });
    await pick(/^HDFC Savings/);
    submit();
    await waitFor(() =>
      expect(markPaid).toHaveBeenCalledWith({
        statementId: 's1',
        body: { amount: 500, paidOn: '2026-10-13', payment: { mode: 'NEW', fromAccountId: 'bank1' } },
      }),
    );
  });

  it('looks up in full with the amount left, and again for a part amount after a pause', async () => {
    renderDialog();
    expect(lookups.at(-1)).toEqual({ amount: null, enabled: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Part payment' }));
    expect(lookups.at(-1)?.enabled).toBe(false);
    fireEvent.change(screen.getByLabelText('Amount paid'), { target: { value: '1200' } });
    expect(lookups.at(-1)?.enabled).toBe(false);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(lookups.at(-1)).toEqual({ amount: 1200, enabled: true });
  });

  it('drops a picked debit when the amount changes and it no longer matches', async () => {
    candidates = [cand(1), cand(2)];
    renderDialog();
    await pick(/UPI to card 2/);
    expect(screen.getByLabelText('Paid on')).toBeDisabled();
    candidates = [];
    fireEvent.click(screen.getByRole('radio', { name: 'Part payment' }));
    fireEvent.change(screen.getByLabelText('Amount paid'), { target: { value: '10' } });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(paidFrom()).toHaveTextContent("Don't add a transaction");
    expect(screen.getByLabelText('Paid on')).toBeEnabled();
  });

  it('shows the server message when it refuses', async () => {
    markPaid.mockRejectedValue(new ApiError(400, { code: 'VALIDATION_ERROR', message: 'The amount must equal the selected debit' } as never));
    candidates = [cand(1)];
    renderDialog();
    submit();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('The amount must equal the selected debit', { tone: 'danger' }),
    );
  });

  it('ignores candidates left from an earlier open until this open has fetched', async () => {
    const onOpenChange = vi.fn();
    const ui = (open: boolean) => (
      <MarkPaidDialog open={open} onOpenChange={onOpenChange} statementId="s1" cardName="HDFC Regalia" remaining={44319} />
    );
    candidates = [cand(1)];
    updatedAt = Date.now();
    const { rerender } = render(ui(true));
    expect(paidFrom()).toHaveTextContent('HDFC Savings · 10 Oct');
    rerender(ui(false));
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    // Reopened: the query still holds the old answer (older than this open).
    rerender(ui(true));
    expect(paidFrom()).toHaveTextContent("Don't add a transaction");
    expect(screen.getByLabelText('Paid on')).toBeEnabled();
    // The fetch for this open lands with different candidates.
    candidates = [cand(2, { accountName: 'ICICI' })];
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    updatedAt = Date.now();
    rerender(ui(true));
    expect(paidFrom()).toHaveTextContent('ICICI · 10 Oct');
  });

  it('stops looking up and keeps the chosen debit locked while the mark is submitting', () => {
    candidates = [cand(1)];
    const { rerender } = renderDialog();
    expect(lookups.at(-1)?.enabled).toBe(true);
    pending = true;
    rerender(
      <MarkPaidDialog open onOpenChange={vi.fn()} statementId="s1" cardName="HDFC Regalia" remaining={44319} />,
    );
    expect(lookups.at(-1)?.enabled).toBe(false);
    expect(paidFrom()).toHaveTextContent('HDFC Savings · 10 Oct');
    expect(screen.getByLabelText('Paid on')).toBeDisabled();
  });
});
