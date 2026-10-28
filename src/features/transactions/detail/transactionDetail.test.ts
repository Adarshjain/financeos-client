import { describe, expect, it } from 'vitest';

import type { Transaction, TransactionLinkResponse } from '@/lib/transaction.types';

import {
  balanceAfterWords,
  bankBalanceWords,
  cardWords,
  deleteImpact,
  linkRows,
  longDate,
  reviewFieldItems,
  rewardsWords,
  sourceWords,
  statusItems,
} from './transactionDetail';

const txn = (over: Partial<Transaction> = {}): Transaction =>
  ({
    id: 't1',
    accountId: 'a1',
    date: '2026-10-12',
    amount: -3600,
    source: 'gmail_transaction_alert',
    createdAt: '2026-10-12T00:00:00Z',
    ...over,
  }) as Transaction;

describe('longDate', () => {
  it('writes the weekday, day, month and year without reading the device zone', () => {
    expect(longDate('2026-10-12')).toBe('Monday 12 October 2026');
    expect(longDate('2026-01-01T00:00:00')).toBe('Thursday 1 January 2026');
    expect(longDate('nonsense')).toBe('');
  });
});

describe('statusItems', () => {
  it('has none for a reviewed, watched-by-nobody transaction', () => {
    expect(statusItems(txn({ reviewType: 'MANUALLY_REVIEWED' }))).toEqual([]);
  });

  it('lists each review reason, then Watching with its reason, then Excluded', () => {
    const items = statusItems(
      txn({
        reviewType: 'NEEDS_REVIEW',
        reviewReasons: ['UNRECONCILED', 'DUPLICATE_SUSPECT'],
        isTransactionUnderMonitoring: true,
        monitoringReason: 'check the refund',
        isTransactionExcluded: true,
      }),
    );
    expect(items.map((i) => i.label)).toEqual(['Unreconciled', 'Duplicate', 'Watching', '“check the refund”', 'Excluded']);
    expect(items.map((i) => i.tone)).toEqual(['warning', 'warning', 'warning', 'neutral', 'neutral']);
  });

  it('says Needs review when it has no reason, and Watching alone without one', () => {
    expect(statusItems(txn({ reviewType: 'NEEDS_REVIEW' })).map((i) => i.label)).toEqual(['Needs review']);
    expect(statusItems(txn({ isTransactionUnderMonitoring: true, monitoringReason: ' ' })).map((i) => i.label)).toEqual(['Watching']);
  });
});

describe('reviewFieldItems', () => {
  it('shows the reasons then "needs review", or the review state', () => {
    expect(reviewFieldItems(txn({ reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED'] })).map((i) => i.label)).toEqual([
      'Unreconciled',
      'needs review',
    ]);
    expect(reviewFieldItems(txn({ reviewType: 'AUTO_REVIEWED' }))[0].label).toBe('Auto reviewed');
    expect(reviewFieldItems(txn({ reviewType: 'MANUALLY_REVIEWED' }))[0].label).toBe('Manually reviewed');
    expect(reviewFieldItems(txn({ reviewType: null }))[0].label).toBe('Not applicable');
  });
});

describe('field words', () => {
  it('writes the card only when there is one', () => {
    expect(cardWords(txn())).toBeNull();
    expect(cardWords(txn({ cardLabel: 'Meera', cardLast4: '7742' }))).toBe('Meera · ••7742');
  });

  it('writes the source in words', () => {
    expect(sourceWords('gmail_statement')).toBe('Gmail statement');
    expect(sourceWords('manual')).toBe('Manual entry');
  });

  it('writes the balance without a "bal" prefix', () => {
    expect(balanceAfterWords(txn({ balance: 295030 }))).toBe('₹2,95,030 after');
    expect(balanceAfterWords(txn({ balance: null }))).toBeNull();
  });

  it('puts the minus before the rupee sign on a negative balance', () => {
    expect(balanceAfterWords(txn({ balance: -208100 }))).toBe('-₹2,08,100 after');
  });

  it('writes only the reward fields that are set, and nothing when none is', () => {
    expect(rewardsWords(txn())).toBeNull();
    expect(
      rewardsWords(txn({ settlementDate: '2026-10-14', channel: 'UPI', instantDiscount: 120, convenienceFee: 0, isEmi: true })),
    ).toBe('Settled 14 Oct · UPI · ₹120.00 discount · No fee · EMI');
  });
});

describe('linkRows', () => {
  const link: TransactionLinkResponse = {
    id: 'l1',
    type: 'REFUND',
    createdBy: 'USER',
    createdAt: '2026-10-14T00:00:00Z',
    members: [
      { transactionId: 't1', isAnchor: true, signedAmount: -3600, description: 'BigBasket', date: '2026-10-12', accountId: 'a1', roleLabel: 'Refunded purchase' },
      { transactionId: 't2', isAnchor: false, signedAmount: 240, description: 'BigBasket refund', date: '2026-10-14', accountId: 'a1', roleLabel: '' },
    ],
  };

  it('has one row per other transaction, named and described, falling back to the derived role', () => {
    const rows = linkRows('t1', [link], [], () => 'HDFC Regalia Gold');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'transaction',
      title: 'BigBasket refund',
      otherId: 't2',
      subtitle: 'Refund · +₹240.00 · 14 Oct · HDFC Regalia Gold',
    });
  });

  it('has one row per record, with where it opens and how it unlinks', () => {
    const rows = linkRows(
      't1',
      [],
      [
        { kind: 'LENDING', id: 'e1', parentId: 'p1', label: 'Lending · Priya Nair' },
        { kind: 'DIVIDEND', id: 'd1', parentId: 'i1', label: 'Dividend · TCS', amount: 1200 },
        { kind: 'LOAN_PAYMENT', id: 'pay1', parentId: 'loan1', label: 'EMI #8' },
        { kind: 'LOAN_EVENT', id: 'ev1', parentId: 'loan1', label: 'Prepayment' },
        { kind: 'EPF_WITHDRAWAL', id: 'w1', parentId: 'emp1', label: 'EPF withdrawal' },
      ],
      () => '',
    );
    expect(rows.map((r) => (r.kind === 'record' ? [r.href, r.unlink] : null))).toEqual([
      ['/loans/lendings/p1', 'now'],
      ['/investments/dividends?instrumentId=i1', 'now'],
      ['/loans/loan1', 'confirm'],
      ['/loans/loan1', null],
      ['/investments/epf', 'now'],
    ]);
    expect(rows[1]).toMatchObject({ subtitle: '₹1,200.00' });
  });
});

describe('deleteImpact', () => {
  it('says what stays when records are linked', () => {
    const impact = deleteImpact(
      txn({
        source: 'manual',
        obligationRefs: [
          { kind: 'LENDING', id: 'e1', parentId: 'p1', label: 'Lending · Priya' },
          { kind: 'DIVIDEND', id: 'd1', parentId: 'i1', label: 'Dividend · TCS' },
        ],
      }),
    );
    expect(impact.some((l) => l.includes('2 linked records stay (Lending · Priya, Dividend · TCS) but lose the link'))).toBe(true);
    expect(impact.some((l) => l.includes('discouraged'))).toBe(false);
  });

  it('warns about an imported transaction and speaks of one record in the singular', () => {
    const impact = deleteImpact(
      txn({ source: 'gmail_statement', obligationRefs: [{ kind: 'LENDING', id: 'e1', parentId: 'p1', label: 'Lending · Priya' }] }),
    );
    expect(impact.some((l) => l.startsWith('1 linked record stays'))).toBe(true);
    expect(impact.at(-1)).toBe('This is not a manually created transaction. It is discouraged to delete this.');
  });
});

describe('bankBalanceWords', () => {
  it('is null when the balance matches the bank', () => {
    expect(bankBalanceWords(txn({ balance: 100, bankBalance: null }))).toBeNull();
    expect(bankBalanceWords(txn({ balance: 100 }))).toBeNull();
  });

  it('gives the bank figure and the difference for a bank account', () => {
    expect(bankBalanceWords(txn({ balance: 288.88, bankBalance: 144.86 }))).toBe('Bank says ₹144.86 · differs by ₹144.02');
    expect(bankBalanceWords(txn({ balance: 1000, bankBalance: 1234567.5 }))).toBe('Bank says ₹12,34,567.50 · differs by ₹12,33,567.50');
  });

  it('keeps the ledger sign on a card (owed is negative)', () => {
    expect(bankBalanceWords(txn({ balance: -5000, bankBalance: -4500.25 }))).toBe('Bank says -₹4,500.25 · differs by ₹499.75');
  });
});
