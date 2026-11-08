import { describe, expect, it } from 'vitest';

import { buildBillRow } from '@/features/accounts/detail/billsHistoryModel';
import { buildLimitCycle } from '@/features/accounts/detail/overview/cardOverviewModel';
import { buildStatementRow } from '@/features/accounts/detail/statements/listModel';
import type { CreditCard } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import type { StatementSummary } from '@/lib/statement.types';
import { AccountType } from '@/lib/types';
import { pinClock } from '@/test/pinClock';

import { billPaidDate, paidFromCaption } from './billsModel';

pinClock();

type Payment = NonNullable<CardBillResponse['payments']>[number];
const pay = (over: Partial<Payment> = {}): Payment => ({
  transactionId: 't1',
  bankTransactionId: 'b1',
  bankAccountName: 'HDFC Savings',
  date: '2026-10-10',
  amount: 44319,
  origin: 'USER',
  ...over,
});
const bill = (payments: Payment[], over: Partial<CardBillResponse> = {}): CardBillResponse => ({
  missingDetails: [],
  accountId: 'c1',
  accountName: 'HDFC Regalia',
  muted: false,
  paidSource: 'NONE',
  status: 'PAID',
  statementId: 's1',
  periodEnd: '2026-10-05',
  paymentDueDate: '2026-10-25',
  totalAmountDue: 44319,
  paidMarkedOn: '2026-10-10',
  payments,
  ...over,
});

describe('paidFromCaption', () => {
  it('names the bank account and date of the one payment', () => {
    expect(paidFromCaption(bill([pay()]))).toBe('Paid from HDFC Savings · 10 Oct');
  });
  it('drops the account when the payment has none', () => {
    expect(paidFromCaption(bill([pay({ bankAccountName: null })]))).toBe('Paid · 10 Oct');
  });
  it('counts several payments', () => {
    expect(paidFromCaption(bill([pay(), pay({ transactionId: 't2' })]))).toBe('Paid in 2 payments');
  });
  it('is null with no payments, or when the field is absent', () => {
    expect(paidFromCaption(bill([]))).toBeNull();
    expect(paidFromCaption({})).toBeNull();
  });
});

describe('billPaidDate', () => {
  it('is the latest payment date, else the manual mark, else null', () => {
    expect(billPaidDate(bill([pay({ date: '2026-10-08' }), pay({ date: '2026-10-12' })]))).toBe('2026-10-12');
    expect(billPaidDate(bill([], { paidMarkedOn: '2026-10-09' }))).toBe('2026-10-09');
    expect(billPaidDate(bill([], { paidMarkedOn: null }))).toBeNull();
    expect(billPaidDate(bill([pay({ date: '2026-10-08' })], { paidMarkedOn: '2026-10-20' }))).toBe('2026-10-08');
  });
});

describe('paid rows show where the bill was paid from', () => {
  const card: CreditCard = {
    id: 'c1',
    type: AccountType.CREDIT_CARD,
    name: 'HDFC Regalia',
    last4: '7741',
    creditLimit: 300000,
    effectiveCreditLimit: 300000,
    balance: -100,
    balanceAnchored: true,
  };
  const stmt = { id: 'b', source: 'gmail', sourceRef: 'a', periodEnd: '2026-10-05', transactionCount: 14 } as unknown as StatementSummary;

  it('bills history keeps the timing after it, and falls back to the paid date without payments', () => {
    const row = buildBillRow({ statementId: 's1', periodEnd: '2026-10-05', bill: bill([pay()]) });
    expect(row.caption).toBe('Paid from HDFC Savings · 10 Oct · on time');
    expect(buildBillRow({ statementId: 's1', periodEnd: '2026-10-05', bill: bill([]) }).caption).toBe(
      'Paid 10 Oct · on time',
    );
  });

  it('the statements list swaps the paid date for the payment', () => {
    expect(buildStatementRow(stmt, bill([pay()]), true, null).caption).toBe(
      'Email · 14 lines · ₹44,319.00 · paid from HDFC Savings · 10 Oct',
    );
    expect(buildStatementRow(stmt, bill([pay()], { paidSource: 'MANUAL' }), true, null)).toMatchObject({ undo: true });
    expect(buildStatementRow(stmt, bill([]), true, null).caption).toBe('Email · 14 lines · ₹44,319.00 · paid 10 Oct');
  });

  it('the card overview bill caption names the account', () => {
    const summary = { periodEnd: '2026-10-05', history: [] };
    expect(buildLimitCycle(card, summary, bill([pay()]), '2026-10-13').bill.caption).toBe(
      'Paid from HDFC Savings · 10 Oct · on time',
    );
    expect(buildLimitCycle(card, summary, bill([pay({ bankAccountName: null })]), '2026-10-13').bill.caption).toBe(
      'Paid · 10 Oct · on time',
    );
    expect(buildLimitCycle(card, summary, bill([]), '2026-10-13').bill.caption).toBe('Paid 10 Oct · on time');
  });

  it('a bill paid by recorded payments only (no manual mark) is named on the overview and timed by the payment', () => {
    const summary = { periodEnd: '2026-10-05', history: [] };
    const credits = bill([pay({ date: '2026-10-27' })], { paidSource: 'CREDITS', paidMarkedOn: null });
    expect(buildLimitCycle(card, summary, credits, '2026-10-29').bill.caption).toBe(
      'Paid from HDFC Savings · 27 Oct · late',
    );
    expect(buildBillRow({ statementId: 's1', periodEnd: '2026-10-05', bill: credits }).caption).toBe(
      'Paid from HDFC Savings · 27 Oct · late',
    );
    expect(buildLimitCycle(card, summary, bill([], { paidMarkedOn: null }), '2026-10-29').bill.caption).toBe('Paid');
  });

  it('the statements row offers Undo for recorded payments of any source', () => {
    const credits = bill([pay({ origin: 'AUTO' })], { paidSource: 'CREDITS', paidMarkedOn: null });
    const row = buildStatementRow(stmt, credits, true, null);
    expect(row.undo).toBe(true);
    expect(row.caption).not.toContain('marked by you');
    expect(buildStatementRow(stmt, bill([], { paidSource: 'CREDITS' }), true, null).undo).toBe(false);
  });
});
