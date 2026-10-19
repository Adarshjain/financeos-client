import { describe, expect, it } from 'vitest';

import type { CardBillResponse } from '@/lib/api/types';
import type { StatementSummary } from '@/lib/statement.types';

import {
  billBadge,
  buildStatementRow,
  buildStatementsView,
  fyLabel,
  fyOf,
  isFy,
  signedRupees,
  verdictWord,
} from './listModel';

function stmt(id: string, periodEnd: string, over: Partial<StatementSummary> = {}): StatementSummary {
  return {
    id,
    source: 'file_upload',
    sourceRef: 'a.pdf',
    statementType: 'credit_card',
    periodStart: '2026-09-06',
    periodEnd,
    openingBalance: 46800,
    closingBalance: 44319,
    totalDebits: null,
    totalCredits: null,
    transactionCount: 8,
    linesSkipped: 0,
    parseMode: null,
    chainValidationPct: null,
    checksumOk: true,
    verdict: 'AUTO_INGEST',
    bankName: null,
    accountNumberMasked: null,
    createdAt: '2026-10-13T08:00:00Z',
    ...over,
  };
}

function bill(over: Partial<CardBillResponse> = {}): CardBillResponse {
  return {
    accountId: 'c1',
    accountName: 'Card',
    muted: false,
    paidSource: 'NONE',
    status: 'OPEN',
    paymentDueDate: '2026-10-25',
    daysUntilDue: 12,
    totalAmountDue: 44319,
    ...over,
  };
}

describe('financial years', () => {
  it('runs April to March', () => {
    expect(fyOf('2026-04-01')).toBe('26-27');
    expect(fyOf('2027-03-31')).toBe('26-27');
    expect(fyOf('2026-03-31')).toBe('25-26');
    expect(fyOf('2099-12-31')).toBe('99-00');
    expect(fyOf('nope')).toBeNull();
  });

  it('labels and validates a year', () => {
    expect(fyLabel('26-27')).toBe('FY 26-27');
    expect(isFy('26-27')).toBe(true);
    expect(isFy('99-00')).toBe(true);
    expect(isFy('26-28')).toBe(false);
    expect(isFy('2026')).toBe(false);
    expect(isFy(undefined)).toBe(false);
  });
});

describe('buildStatementsView', () => {
  const list = [
    stmt('a', '2026-08-05'),
    stmt('b', '2026-10-05'),
    stmt('c', '2026-09-05'),
    stmt('old', '2026-02-05'),
  ];

  it('shows the year of today with its newest statement selected, newest first', () => {
    const v = buildStatementsView(list, undefined, undefined, '2026-10-13');
    expect(v.fy).toBe('26-27');
    expect(v.inFy.map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(v.selectedId).toBe('b');
    expect(v.fyOptions).toEqual(['26-27', '25-26']);
  });

  it('falls back to the latest year with statements when this year has none', () => {
    const v = buildStatementsView(list, undefined, undefined, '2027-05-01');
    expect(v.fy).toBe('26-27');
    const old = buildStatementsView([stmt('old', '2026-02-05')], undefined, undefined, '2026-10-13');
    expect(old.fy).toBe('25-26');
    expect(old.selectedId).toBe('old');
  });

  it('honours a valid fy and a statement inside it, and ignores a statement outside it', () => {
    expect(buildStatementsView(list, '25-26', 'old', '2026-10-13').selectedId).toBe('old');
    expect(buildStatementsView(list, '26-27', 'c', '2026-10-13').selectedId).toBe('c');
    expect(buildStatementsView(list, '26-27', 'old', '2026-10-13').selectedId).toBe('b');
    expect(buildStatementsView(list, 'junk', undefined, '2026-10-13').fy).toBe('26-27');
  });

  it('derives the year from a statement named without one', () => {
    const v = buildStatementsView(list, undefined, 'old', '2026-10-13');
    expect(v.fy).toBe('25-26');
    expect(v.selectedId).toBe('old');
  });

  it('keeps an empty year the url asked for, in the options, with nothing selected', () => {
    const v = buildStatementsView(list, '24-25', undefined, '2026-10-13');
    expect(v.fy).toBe('24-25');
    expect(v.inFy).toEqual([]);
    expect(v.selectedId).toBeNull();
    expect(v.fyOptions).toEqual(['26-27', '25-26', '24-25']);
  });

  it('files a statement without a period end under the day it was added', () => {
    const v = buildStatementsView(
      [stmt('x', '', { createdAt: '2026-10-13T00:00:00Z' })],
      undefined,
      undefined,
      '2026-10-13'
    );
    expect(v.inFy).toHaveLength(1);
  });
});

describe('verdictWord', () => {
  it('maps the parse verdict to a plain word', () => {
    expect(verdictWord('AUTO_INGEST')).toEqual({ label: 'Auto ingested', tone: 'success' });
    expect(verdictWord('NEEDS_REVIEW')).toEqual({ label: 'Needs review', tone: 'warning' });
    expect(verdictWord('REJECTED')?.label).toBe('Rejected');
    expect(verdictWord(null)).toBeNull();
  });
});

describe('billBadge', () => {
  it('says Due with the date, warning within three days and neutral beyond', () => {
    expect(billBadge(bill())).toEqual({ tone: 'neutral', label: 'Due 25 Oct' });
    expect(billBadge(bill({ daysUntilDue: 3 }))?.tone).toBe('warning');
  });

  it('marks paid, overdue and partly paid bills', () => {
    expect(billBadge(bill({ status: 'PAID' }))).toEqual({ tone: 'success', label: 'Paid' });
    expect(billBadge(bill({ status: 'OVERDUE' }))).toEqual({ tone: 'danger', label: 'Overdue' });
    expect(billBadge(bill({ status: 'PARTIAL' }))?.label).toBe('Partly paid');
  });

  it('has no badge without a bill', () => {
    expect(billBadge(null)).toBeNull();
  });
});

describe('buildStatementRow', () => {
  it('describes an open card statement with opening and due', () => {
    const row = buildStatementRow(stmt('b', '2026-10-05'), bill(), true, 'b');
    expect(row).toMatchObject({
      title: '5 Oct 2026',
      caption: 'Upload · 8 lines · opening ₹46,800 · due ₹44,319',
      undo: false,
      selected: true,
      verdict: { label: 'Auto ingested' },
      badge: { label: 'Due 25 Oct' },
    });
  });

  it('describes a paid card statement, and offers Undo only when marked by hand', () => {
    const paid = bill({ status: 'PAID', totalAmountDue: 46800, paidMarkedOn: '2026-09-18' });
    const email = stmt('c', '2026-09-05', { source: 'gmail', transactionCount: 14 });
    const row = buildStatementRow(email, paid, true, 'b');
    expect(row.caption).toBe('Email · 14 lines · ₹46,800 · paid 18 Sep');
    expect(row.undo).toBe(false);
    expect(row.selected).toBe(false);

    const manual = buildStatementRow(email, { ...paid, paidSource: 'MANUAL' }, true, null);
    expect(manual.caption).toBe('Email · 14 lines · ₹46,800 · paid 18 Sep · marked by you');
    expect(manual.undo).toBe(true);
  });

  it('keeps only the title facts when the bill is missing', () => {
    const row = buildStatementRow(stmt('b', '2026-10-05'), null, true, null);
    expect(row.caption).toBe('Upload · 8 lines · opening ₹46,800');
    expect(row.badge).toBeNull();
  });

  it('shows the closing balance for a bank account and no bill badge', () => {
    const row = buildStatementRow(
      stmt('b', '2026-10-05', { closingBalance: 125000.4 }),
      bill(),
      false,
      null
    );
    expect(row.caption).toBe('Upload · 8 lines · closing ₹1,25,000');
    expect(row.badge).toBeNull();
    expect(row.undo).toBe(false);
  });
});

describe('signedRupees', () => {
  it('puts the minus before the rupee sign', () => {
    expect(signedRupees(-1200)).toBe('-₹1,200');
    expect(signedRupees(1200)).toBe('₹1,200');
  });
});
