import { describe, expect, it } from 'vitest';

import type { BillStatus, CardBillResponse } from '@/lib/api/types';

import { billCardPhase, buildBillsWidgetModel, deriveBillCardState, isHighlighted } from '../billCardState';

const TODAY = '2026-10-08';

function bill(over: Partial<CardBillResponse> & { accountId: string }): CardBillResponse {
  return {
    accountName: 'Card',
    status: 'OPEN',
    muted: false,
    paidSource: 'NONE',
    possiblePayments: [],
    ...over,
  } as CardBillResponse;
}

describe('billCardPhase', () => {
  it.each<[BillStatus, string]>([
    ['OVERDUE', 'overdue'],
    ['OPEN', 'arrived'],
    ['PARTIAL', 'arrived'],
    ['DUE_UNKNOWN', 'arrived'],
    ['AWAITING_STATEMENT', 'awaiting'],
    ['PAID', 'awaiting'],
    ['NO_DUE', 'awaiting'],
  ])('%s -> %s', (status, phase) => {
    expect(billCardPhase(status)).toBe(phase);
  });
});

describe('deriveBillCardState', () => {
  it('uses remainingAmount for toPay and falls back to totalAmountDue', () => {
    expect(deriveBillCardState(bill({ accountId: 'a', remainingAmount: 300, totalAmountDue: 1000 }), TODAY).toPay).toBe(300);
    expect(deriveBillCardState(bill({ accountId: 'a', totalAmountDue: 1000 }), TODAY).toPay).toBe(1000);
    expect(deriveBillCardState(bill({ accountId: 'a' }), TODAY).toPay).toBeNull();
  });

  it('a zero remainingAmount stays zero (not replaced by the total)', () => {
    expect(deriveBillCardState(bill({ accountId: 'a', remainingAmount: 0, totalAmountDue: 1000 }), TODAY).toPay).toBe(0);
  });

  it('awaiting phase has no toPay even when amounts are present', () => {
    const s = deriveBillCardState(bill({ accountId: 'a', status: 'PAID', remainingAmount: 0, totalAmountDue: 500 }), TODAY);
    expect(s.phase).toBe('awaiting');
    expect(s.toPay).toBeNull();
  });

  it('overdue keeps its amount to pay', () => {
    const s = deriveBillCardState(bill({ accountId: 'a', status: 'OVERDUE', remainingAmount: 700 }), TODAY);
    expect(s.phase).toBe('overdue');
    expect(s.toPay).toBe(700);
  });

  it('nothingPending: awaiting with unbilled null, 0 or negative; not with positive unbilled', () => {
    const mk = (unbilledAmount?: number | null) =>
      deriveBillCardState(bill({ accountId: 'a', status: 'AWAITING_STATEMENT', unbilledAmount }), TODAY).nothingPending;
    expect(mk(null)).toBe(true);
    expect(mk(undefined)).toBe(true);
    expect(mk(0)).toBe(true);
    expect(mk(-50)).toBe(true);
    expect(mk(0.01)).toBe(false);
    expect(mk(1200)).toBe(false);
  });

  it('PAID and NO_DUE cards with no unbilled spend are nothing-pending; with spend they are not', () => {
    expect(deriveBillCardState(bill({ accountId: 'a', status: 'PAID' }), TODAY).nothingPending).toBe(true);
    expect(deriveBillCardState(bill({ accountId: 'a', status: 'NO_DUE' }), TODAY).nothingPending).toBe(true);
    expect(deriveBillCardState(bill({ accountId: 'a', status: 'PAID', unbilledAmount: 10 }), TODAY).nothingPending).toBe(false);
  });

  it('arrived and overdue cards are never nothing-pending, even with no unbilled', () => {
    expect(deriveBillCardState(bill({ accountId: 'a', status: 'OPEN' }), TODAY).nothingPending).toBe(false);
    expect(deriveBillCardState(bill({ accountId: 'a', status: 'OVERDUE' }), TODAY).nothingPending).toBe(false);
  });

  it('statementLate only when awaiting and expected date is strictly before today', () => {
    const mk = (status: BillStatus, nextStatementExpectedOn?: string | null) =>
      deriveBillCardState(bill({ accountId: 'a', status, nextStatementExpectedOn }), TODAY).statementLate;
    expect(mk('AWAITING_STATEMENT', '2026-10-07')).toBe(true);
    expect(mk('AWAITING_STATEMENT', TODAY)).toBe(false);
    expect(mk('AWAITING_STATEMENT', '2026-10-09')).toBe(false);
    expect(mk('AWAITING_STATEMENT', null)).toBe(false);
    expect(mk('OPEN', '2026-10-01')).toBe(false);
  });

  it('exposes unbilled as null when the server sends none', () => {
    expect(deriveBillCardState(bill({ accountId: 'a' }), TODAY).unbilled).toBeNull();
    expect(deriveBillCardState(bill({ accountId: 'a', unbilledAmount: 55 }), TODAY).unbilled).toBe(55);
  });
});

describe('buildBillsWidgetModel', () => {
  it('orders overdue, then arrived by due date, then awaiting by expected date', () => {
    const model = buildBillsWidgetModel(
      [
        bill({ accountId: 'await-late', accountName: 'A', status: 'AWAITING_STATEMENT', unbilledAmount: 5, nextStatementExpectedOn: '2026-10-20' }),
        bill({ accountId: 'open-late', accountName: 'B', status: 'OPEN', paymentDueDate: '2026-10-25', totalAmountDue: 1 }),
        bill({ accountId: 'await-soon', accountName: 'C', status: 'AWAITING_STATEMENT', unbilledAmount: 5, nextStatementExpectedOn: '2026-10-10' }),
        bill({ accountId: 'overdue', accountName: 'D', status: 'OVERDUE', paymentDueDate: '2026-10-01', totalAmountDue: 1 }),
        bill({ accountId: 'open-soon', accountName: 'E', status: 'PARTIAL', paymentDueDate: '2026-10-12', totalAmountDue: 1 }),
      ],
      TODAY,
    );
    expect(model.rows.map((r) => r.bill.accountId)).toEqual(['overdue', 'open-soon', 'open-late', 'await-soon', 'await-late']);
  });

  it('puts undated rows last within their phase and breaks ties by account name', () => {
    const model = buildBillsWidgetModel(
      [
        bill({ accountId: 'undated', accountName: 'Alpha', status: 'DUE_UNKNOWN' }),
        bill({ accountId: 'dated-z', accountName: 'Zed', status: 'OPEN', paymentDueDate: '2026-10-12' }),
        bill({ accountId: 'dated-b', accountName: 'Bee', status: 'OPEN', paymentDueDate: '2026-10-12' }),
        bill({ accountId: 'await-undated', accountName: 'Aaa', status: 'AWAITING_STATEMENT', unbilledAmount: 1 }),
        bill({ accountId: 'await-dated', accountName: 'Zzz', status: 'AWAITING_STATEMENT', unbilledAmount: 1, nextStatementExpectedOn: '2026-10-30' }),
      ],
      TODAY,
    );
    expect(model.rows.map((r) => r.bill.accountId)).toEqual(['dated-b', 'dated-z', 'undated', 'await-dated', 'await-undated']);
  });

  it('splits nothing-pending cards out of the rows, keeping their order', () => {
    const model = buildBillsWidgetModel(
      [
        bill({ accountId: 'paid', accountName: 'Paid', status: 'PAID' }),
        bill({ accountId: 'open', status: 'OPEN', paymentDueDate: '2026-10-12', totalAmountDue: 10 }),
        bill({ accountId: 'idle', accountName: 'Idle', status: 'AWAITING_STATEMENT', unbilledAmount: 0, nextStatementExpectedOn: '2026-10-01' }),
      ],
      TODAY,
    );
    expect(model.rows.map((r) => r.bill.accountId)).toEqual(['open']);
    expect(model.nothingPending.map((r) => r.bill.accountId)).toEqual(['idle', 'paid']);
  });

  it('toPayTotal sums arrived and overdue toPay (null counts as 0); awaiting never contributes', () => {
    const model = buildBillsWidgetModel(
      [
        bill({ accountId: '1', status: 'OPEN', remainingAmount: 100 }),
        bill({ accountId: '2', status: 'OVERDUE', totalAmountDue: 250 }),
        bill({ accountId: '3', status: 'DUE_UNKNOWN' }),
        bill({ accountId: '4', status: 'PAID', totalAmountDue: 9999, remainingAmount: 9999 }),
      ],
      TODAY,
    );
    expect(model.toPayTotal).toBe(350);
  });

  it('unbilledTotal sums only positive unbilled across every phase', () => {
    const model = buildBillsWidgetModel(
      [
        bill({ accountId: '1', status: 'OPEN', unbilledAmount: 40 }),
        bill({ accountId: '2', status: 'AWAITING_STATEMENT', unbilledAmount: 60 }),
        bill({ accountId: '3', status: 'AWAITING_STATEMENT', unbilledAmount: -500 }),
        bill({ accountId: '4', status: 'AWAITING_STATEMENT', unbilledAmount: 0 }),
        bill({ accountId: '5', status: 'PAID' }),
      ],
      TODAY,
    );
    expect(model.unbilledTotal).toBe(100);
  });

  it('empty input gives an empty model', () => {
    expect(buildBillsWidgetModel([], TODAY)).toEqual({ rows: [], nothingPending: [], toPayTotal: 0, unbilledTotal: 0 });
  });
});

describe('isHighlighted', () => {
  const b = bill({ accountId: 'acc-1', statementId: 'st-1' });
  it('matches by statement id or account id', () => {
    expect(isHighlighted(b, { statementId: 'st-1', accountId: null })).toBe(true);
    expect(isHighlighted(b, { statementId: null, accountId: 'acc-1' })).toBe(true);
  });
  it('does not match when neither matches or both are null', () => {
    expect(isHighlighted(b, { statementId: 'x', accountId: 'y' })).toBe(false);
    expect(isHighlighted(b, { statementId: null, accountId: null })).toBe(false);
  });
  it('a null statementId on the bill never matches a null highlight', () => {
    expect(isHighlighted(bill({ accountId: 'a', statementId: null }), { statementId: null, accountId: null })).toBe(false);
  });
});
