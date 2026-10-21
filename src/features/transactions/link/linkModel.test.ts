import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';

import {
  anchorAfterRemove,
  anchorAfterRole,
  buildLinkRequest,
  counterpartRules,
  coverageLine,
  defaultAnchorId,
  disabledLinkKinds,
  effectiveAnchorId,
  linkProblem,
  linkTitle,
  linkTypesFor,
  roleLabel,
} from './linkModel';

const tx = (id: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  ({ id, amount, accountId: 'a1', date: '2026-10-12', description: id, ...over }) as Transaction;

describe('disabledLinkKinds', () => {
  it('disables every record for several transactions, with one reason', () => {
    const d = disabledLinkKinds(undefined, 3);
    expect(d.LENDING).toBe('Select a single transaction to record a lending, loan payment or dividend');
    expect(d.LOAN_PAYMENT).toBe(d.LENDING);
    expect(d.DIVIDEND).toBe(d.LENDING);
  });

  it('keeps loan payments to money out and dividends to money in', () => {
    expect(disabledLinkKinds(tx('d', -100), 1)).toEqual({ DIVIDEND: 'Dividends must be money-in (credit) transactions' });
    expect(disabledLinkKinds(tx('c', 100), 1)).toEqual({
      LOAN_PAYMENT: 'Loan payments must be money-out (debit) transactions',
    });
  });

  it('says why a transaction that already carries a record cannot take another', () => {
    const lent = tx('d', -100, { obligationRefs: [{ kind: 'LENDING', id: 'l1' }] } as Partial<Transaction>);
    expect(disabledLinkKinds(lent, 1)).toEqual({
      LOAN_PAYMENT: 'Already linked to a ledger/loan record',
      DIVIDEND: 'Already linked to a ledger/loan/dividend record',
    });
    const loan = tx('d', -100, { obligationRefs: [{ kind: 'LOAN_PAYMENT', id: 'p1' }] } as Partial<Transaction>);
    expect(disabledLinkKinds(loan, 1).LENDING).toBe('Already linked to a loan or dividend record');
  });

  it('disables nothing without a transaction', () => {
    expect(disabledLinkKinds(undefined, 0)).toEqual({});
  });
});

describe('anchors', () => {
  const debit = tx('d', -100);
  const credit = tx('c', 100);
  it('defaults to the first money-out transaction, else the first', () => {
    expect(defaultAnchorId([credit, debit])).toBe('d');
    expect(defaultAnchorId([credit, tx('c2', 5)])).toBe('c');
    expect(defaultAnchorId([])).toBe('');
  });
  it('keeps a chosen anchor while it is a member', () => {
    expect(effectiveAnchorId([credit, debit], 'c')).toBe('c');
    expect(effectiveAnchorId([credit, debit], 'gone')).toBe('d');
  });
  it('makes a row the anchor, and hands the anchor on when its row stops being one', () => {
    const rows = [credit, debit];
    expect(anchorAfterRole(rows, 'd', 'c', 'anchor')).toBe('c');
    expect(anchorAfterRole(rows, 'd', 'c', 'member')).toBe('d');
    expect(anchorAfterRole(rows, 'd', 'd', 'member')).toBe('c');
  });
  it('picks a new default when the anchor is removed', () => {
    expect(anchorAfterRemove([credit, debit, tx('d2', -5)], 'd', 'd')).toBe('d2');
    expect(anchorAfterRemove([credit, debit], 'd', 'c')).toBe('d');
  });
});

describe('buildLinkRequest and linkProblem', () => {
  it('marks the anchor, trims the note and sends the refund choice only for a refund', () => {
    const members = [tx('a', -1), tx('b', 1)];
    expect(buildLinkRequest({ type: 'REFUND', members, anchorId: 'a', note: ' hi ', alignRefundCategories: false })).toEqual({
      type: 'REFUND',
      members: [
        { transactionId: 'a', isAnchor: true },
        { transactionId: 'b', isAnchor: false },
      ],
      note: 'hi',
      alignRefundCategories: false,
    });
    const transfer = buildLinkRequest({ type: 'TRANSFER', members, anchorId: 'a', note: ' ', alignRefundCategories: true });
    expect(transfer).not.toHaveProperty('note');
    expect(transfer).not.toHaveProperty('alignRefundCategories');
  });
  it('needs two transactions and a main one', () => {
    expect(linkProblem(1, 'a')).toMatch(/at least one more/);
    expect(linkProblem(2, '')).toMatch(/main/);
    expect(linkProblem(2, 'a')).toBeNull();
  });
});

describe('counterpartRules', () => {
  const never = () => false;
  it('offers the opposite direction on another account for a transfer', () => {
    const r = counterpartRules('TRANSFER', tx('d', -1), never);
    expect(r.type).toBe('CREDIT');
    expect(r.accept({ amount: 5, accountId: 'a2' })).toBe(true);
    expect(r.accept({ amount: 5, accountId: 'a1' })).toBe(false);
    expect(r.accept({ amount: -5, accountId: 'a2' })).toBe(false);
  });
  it('wants a credit card credit for a card bill payment, and the opposite way round from a card credit', () => {
    const isCard = (id: string) => id === 'card';
    const pay = counterpartRules('CC_PAYMENT', tx('d', -1), isCard);
    expect(pay.accept({ amount: 5, accountId: 'card' })).toBe(true);
    expect(pay.accept({ amount: 5, accountId: 'a2' })).toBe(false);
    const fromCard = counterpartRules('CC_PAYMENT', tx('c', 1, { accountId: 'card' }), isCard);
    expect(fromCard.type).toBe('DEBIT');
    expect(fromCard.accept({ amount: -5, accountId: 'a2' })).toBe(true);
    expect(fromCard.accept({ amount: -5, accountId: 'card' })).toBe(false);
    const elsewhere = counterpartRules('CC_PAYMENT', tx('c', 1, { accountId: 'a2' }), isCard);
    expect(elsewhere.accept({ amount: -5, accountId: 'a1' })).toBe(false);
  });
  it('asks a refund for the opposite direction, a reversal for it on the same account, a fee or installment for debits', () => {
    expect(counterpartRules('REFUND', tx('c', 1), never).type).toBe('DEBIT');
    const rev = counterpartRules('REVERSAL', tx('d', -1), never);
    expect(rev.accept({ amount: 5, accountId: 'a1' })).toBe(true);
    expect(rev.accept({ amount: 5, accountId: 'a2' })).toBe(false);
    for (const t of ['FEE', 'EMI'] as const) {
      const r = counterpartRules(t, tx('d', -1), never);
      expect(r.type).toBe('DEBIT');
      expect(r.accept({ amount: 5, accountId: 'a1' })).toBe(false);
    }
  });
  it('asks nothing without a reference', () => {
    expect(counterpartRules('REFUND', undefined, never).type).toBeNull();
  });
});

describe('coverageLine', () => {
  const purchase = tx('p', -24990);
  it('says fully refunded when the refunds add up to the purchase', () => {
    expect(coverageLine('REFUND', [purchase, tx('r1', 20000), tx('r2', 4990)], 'p')).toBe(
      'Refunds ₹24,990 of ₹24,990 · fully refunded',
    );
  });
  it('says partly refunded, or by how much it is over', () => {
    expect(coverageLine('REFUND', [purchase, tx('r', 240)], 'p')).toBe('Refunds ₹240 of ₹24,990 · partly refunded');
    expect(coverageLine('REFUND', [purchase, tx('r', 25000)], 'p')).toBe(
      'Refunds ₹25,000 of ₹24,990 · ₹10 more than the purchase',
    );
  });
  it('is only for a refund with a purchase and refunds', () => {
    expect(coverageLine('TRANSFER', [purchase, tx('r', 5)], 'p')).toBeNull();
    expect(coverageLine('REFUND', [purchase], 'p')).toBeNull();
    expect(coverageLine('REFUND', [tx('r', 5), tx('r2', 6)], 'r')).toBeNull();
  });
});

describe('titles and role words', () => {
  it('names one transaction with its amount, and counts several', () => {
    expect(linkTitle([tx('a', -3600, { description: 'BigBasket' })])).toBe('Link BigBasket · ₹3,600 to…');
    expect(linkTitle([tx('a', -1), tx('b', 1), tx('c', 1)])).toBe('Link 3 transactions');
  });
  it('says Purchase and Refund for a refund', () => {
    expect(roleLabel('REFUND', 'anchor')).toBe('Purchase');
    expect(roleLabel('REFUND', 'member')).toBe('Refund');
    expect(roleLabel('TRANSFER', 'member')).toBe('Transfer in');
  });
});

describe('linkTypesFor', () => {
  it('offers every type for a debit and for several transactions', () => {
    expect(linkTypesFor(tx('a', -100))).toEqual(['TRANSFER', 'CC_PAYMENT', 'REFUND', 'REVERSAL', 'FEE', 'EMI']);
    expect(linkTypesFor(undefined)).toContain('FEE');
  });

  it('hides Fee and EMI for a credit', () => {
    expect(linkTypesFor(tx('a', 250))).toEqual(['TRANSFER', 'CC_PAYMENT', 'REFUND', 'REVERSAL']);
  });
});
