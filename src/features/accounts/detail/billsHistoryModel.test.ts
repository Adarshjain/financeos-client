import { describe, expect, it } from 'vitest';

import type { CardBillResponse } from '@/lib/api/types';

import { buildBillRow, buildBillRows, paidTiming } from './billsHistoryModel';

function bill(over: Partial<CardBillResponse> = {}): CardBillResponse {
  return {
    missingDetails: [],
    accountId: 'c1',
    accountName: 'HDFC',
    muted: false,
    paidSource: 'NONE',
    status: 'OPEN',
    statementId: 's1',
    paymentDueDate: '2026-10-25',
    daysUntilDue: 12,
    totalAmountDue: 44319,
    ...over,
  };
}
const entry = (b: CardBillResponse | null, periodEnd = '2026-10-05') => ({
  statementId: 's1',
  periodEnd,
  bill: b,
});

describe('paidTiming', () => {
  it('compares paid and due dates, and is null when one is missing', () => {
    expect(paidTiming('2026-09-25', '2026-09-25')).toBe('on time');
    expect(paidTiming('2026-09-26', '2026-09-25')).toBe('late');
    expect(paidTiming(null, '2026-09-25')).toBeNull();
    expect(paidTiming('2026-09-25', undefined)).toBeNull();
  });
});

describe('buildBillRow', () => {
  it('turns an open bill amber only within 3 days of its due date', () => {
    expect(buildBillRow(entry(bill({ daysUntilDue: 3 }))).badge).toEqual({ tone: 'warning', label: '3 d' });
    expect(buildBillRow(entry(bill({ daysUntilDue: 4 }))).badge).toEqual({ tone: 'neutral', label: '4 d' });
  });

  it('shows an open bill with days left and its amount', () => {
    expect(buildBillRow(entry(bill()))).toEqual({
      key: 's1',
      title: '5 Oct statement',
      caption: 'Due 25 Oct',
      badge: { tone: 'neutral', label: '12 d' },
      amount: '₹44,319',
      muted: false,
    });
  });

  it('shows a paid bill muted with its paid date and timing', () => {
    const row = buildBillRow(
      entry(bill({ status: 'PAID', paidMarkedOn: '2026-10-10', totalAmountDue: 46800 }))
    );
    expect(row).toMatchObject({
      caption: 'Paid 10 Oct · on time',
      badge: { tone: 'success', label: 'Paid' },
      amount: '₹46,800',
      muted: true,
    });
  });

  it('marks late payments, overdue and part-paid bills', () => {
    expect(
      buildBillRow(entry(bill({ status: 'PAID', paidMarkedOn: '2026-10-28' }))).caption
    ).toBe('Paid 28 Oct · late');
    expect(buildBillRow(entry(bill({ status: 'OVERDUE', daysUntilDue: -2 })))).toMatchObject({
      caption: 'Due 25 Oct',
      badge: { tone: 'danger', label: 'Overdue' },
    });
    expect(buildBillRow(entry(bill({ status: 'PARTIAL' }))).badge).toEqual({
      tone: 'warning',
      label: 'Partly paid',
    });
  });

  it('gives an open bill past its days no day badge, and a missing due date no caption', () => {
    expect(buildBillRow(entry(bill({ daysUntilDue: null }))).badge).toBeNull();
    expect(
      buildBillRow(entry(bill({ status: 'DUE_UNKNOWN', paymentDueDate: null })))
    ).toMatchObject({ caption: null, badge: { tone: 'info', label: 'Due date missing' } });
  });

  it('keeps just the title when the bill failed to load', () => {
    expect(buildBillRow(entry(null))).toMatchObject({
      title: '5 Oct statement',
      caption: null,
      badge: null,
      amount: null,
    });
  });
});

describe('buildBillRows', () => {
  it('sorts newest first and keeps the latest three', () => {
    const rows = buildBillRows(
      ['2026-07-05', '2026-10-05', '2026-08-05', '2026-09-05'].map((d) => ({
        ...entry(null, d),
        statementId: d,
      }))
    );
    expect(rows.map((r) => r.title)).toEqual(['5 Oct statement', '5 Sep statement', '5 Aug statement']);
  });

  it('is empty with no statements', () => {
    expect(buildBillRows([])).toEqual([]);
  });
});
