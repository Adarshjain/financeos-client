import { describe, expect, it } from 'vitest';

import type { CardBillResponse } from '@/lib/api/types';
import type { StatementSummary } from '@/lib/statement.types';
import { pinClock } from '@/test/pinClock';

import {
  billBadge,
  buildListRows,
  buildStatementRow,
  buildStatementsView,
  fyBounds,
  fyLabel,
  fyOf,
  isFy,
  signedRupees,
  verdictWord,
} from './listModel';

pinClock();

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
    missingDetails: [],
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
    expect(fyBounds('26-27')).toEqual({ from: '2026-04-01', to: '2027-03-31' });
    expect(fyBounds('99-00')).toEqual({ from: '2099-04-01', to: '2100-03-31' });
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
      title: '5 Oct 26',
      caption: 'Upload · 8 lines · opening ₹46,800.00 · due ₹44,319.00',
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
    expect(row.caption).toBe('Email · 14 lines · ₹46,800.00 · paid 18 Sep');
    expect(row.undo).toBe(false);
    expect(row.selected).toBe(false);

    const manual = buildStatementRow(email, { ...paid, paidSource: 'MANUAL' }, true, null);
    expect(manual.caption).toBe('Email · 14 lines · ₹46,800.00 · paid 18 Sep · marked by you');
    expect(manual.undo).toBe(true);
  });

  it('keeps only the title facts when the bill is missing', () => {
    const row = buildStatementRow(stmt('b', '2026-10-05'), null, true, null);
    expect(row.caption).toBe('Upload · 8 lines · opening ₹46,800.00');
    expect(row.badge).toBeNull();
  });

  it('shows the closing balance for a bank account and no bill badge', () => {
    const row = buildStatementRow(
      stmt('b', '2026-10-05', { closingBalance: 125000.4 }),
      bill(),
      false,
      null
    );
    expect(row.caption).toBe('Upload · 8 lines · closing ₹1,25,000.40');
    expect(row.badge).toBeNull();
    expect(row.undo).toBe(false);
  });
});

describe('buildStatementRow missing details', () => {
  it('shows Details missing in place of the verdict on a card row', () => {
    const row = buildStatementRow(
      stmt('a', '2026-10-05', { missingDetails: ['DUE_DATE'] }),
      bill(),
      true,
      'a'
    );
    expect(row.verdict).toEqual({ label: 'Details missing', tone: 'warning' });
  });

  it('drops the due-unknown badge beside Details missing, keeps other bill badges', () => {
    const gappy = stmt('a', '2026-10-05', { missingDetails: ['DUE_DATE'] });
    expect(buildStatementRow(gappy, bill({ status: 'DUE_UNKNOWN' }), true, 'a').badge).toBeNull();
    expect(buildStatementRow(gappy, bill({ status: 'PAID' }), true, 'a').badge?.label).toBe('Paid');
  });

  it('keeps the verdict when nothing is missing, and on a bank row', () => {
    expect(
      buildStatementRow(
        stmt('a', '2026-10-05', { missingDetails: [] }),
        bill(),
        true,
        'a'
      ).verdict?.label
    ).toBe('Auto ingested');
    expect(
      buildStatementRow(
        stmt('a', '2026-10-05', { missingDetails: ['DUE_DATE'] }),
        null,
        false,
        'a'
      ).verdict?.label
    ).toBe('Auto ingested');
  });
});

describe('signedRupees', () => {
  it('puts the minus before the rupee sign', () => {
    expect(signedRupees(-1200)).toBe('−₹1,200.00');
    expect(signedRupees(1200)).toBe('₹1,200.00');
  });
});

describe('buildListRows', () => {
  const rowOf = (s: StatementSummary) => buildStatementRow(s, null, true, null);
  const skip = (id: string, periodStart: string, periodEnd: string) => ({
    id,
    periodStart,
    periodEnd,
    createdAt: '2026-10-05T00:00:00Z',
  });
  const kinds = (rows: ReturnType<typeof buildListRows>) =>
    rows.map((r) => (r.kind === 'statement' ? r.row.id : `${r.kind}:${r.periodEnd}`));

  it('is just the statements with no skip data', () => {
    const inFy = [stmt('b', '2026-10-05'), stmt('a', '2026-09-05')];
    expect(kinds(buildListRows(inFy, rowOf, null, '26-27'))).toEqual(['b', 'a']);
  });

  it('puts the missing cycle first and merges skipped periods by date, newest first', () => {
    const inFy = [stmt('b', '2026-08-05'), stmt('a', '2026-05-05')];
    const skips = {
      missing: { periodStart: '2026-09-06', periodEnd: '2026-10-05', expectedBy: '2026-10-12' },
      skipped: [skip('k2', '2026-06-06', '2026-07-05'), skip('k1', '2026-07-06', '2026-08-05')],
    };
    expect(kinds(buildListRows(inFy, rowOf, skips, '26-27'))).toEqual([
      'missing:2026-10-05',
      'b',
      'skipped:2026-08-05',
      'skipped:2026-07-05',
      'a',
    ].filter(Boolean));
  });

  it('shows only the shown year\'s skipped periods, but the missing cycle whichever year', () => {
    const skips = {
      missing: { periodStart: '2026-09-06', periodEnd: '2026-10-05', expectedBy: '2026-10-12' },
      skipped: [skip('old', '2026-02-06', '2026-03-05')],
    };
    expect(kinds(buildListRows([], rowOf, skips, '26-27'))).toEqual(['missing:2026-10-05']);
    expect(kinds(buildListRows([], rowOf, skips, '25-26'))).toEqual(['missing:2026-10-05', 'skipped:2026-03-05']);
  });

  it('words the rows', () => {
    const skips = {
      missing: { periodStart: '2026-09-06', periodEnd: '2026-10-05', expectedBy: '2026-10-12' },
      skipped: [skip('k', '2026-08-06', '2026-09-05')],
    };
    const [missing, skipped] = buildListRows([], rowOf, skips, '26-27');
    expect(missing).toMatchObject({ title: 'Statement missing', id: null, caption: '6 Sep 26 to 5 Oct 26' });
    expect(skipped).toMatchObject({ title: 'No statement', id: 'k', caption: '6 Aug 26 to 5 Sep 26' });
  });
});
