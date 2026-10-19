import { describe, expect, it } from 'vitest';

import type { CardBillResponse } from '@/lib/api/types';

import {
  buildDetailModel,
  buildLineRow,
  deletionImpact,
  deletionNote,
  ledgerLine,
  type StatementDetailData,
} from './detailModel';

type Line = StatementDetailData['lines'][number];

const line = (over: Partial<Line> = {}): Line => ({
  transactionId: 't1',
  date: '2026-09-09',
  description: 'CROMA ELECTRONICS',
  amount: 24990,
  type: 'DEBIT',
  origin: 'matched',
  ...over,
});

function detail(over: Partial<StatementDetailData> = {}): StatementDetailData {
  return {
    id: 's1',
    createdAt: '2026-10-13T08:00:00Z',
    source: 'file_upload',
    sourceRef: 'Regalia-Gold-statement.pdf',
    periodStart: '2026-09-06',
    periodEnd: '2026-10-05',
    openingBalance: 46800,
    closingBalance: 44319,
    transactionCount: 2,
    linesSkipped: 0,
    checksumOk: true,
    matchesLedger: true,
    ledgerBalanceAtClose: 44319,
    cardDetails: { totalAmountDue: 44319, minimumAmountDue: 2500, paymentDueDate: '2026-10-25' },
    lines: [line(), line({ transactionId: 't2', origin: 'created', description: 'NYKAA' })],
    ...over,
  };
}

describe('ledgerLine', () => {
  it('says it matches, or names the ledger figure when it does not', () => {
    expect(ledgerLine(44319, true, 44319)).toBe('Closing balance ₹44,319 · matches ledger');
    expect(ledgerLine(44319, false, 43000)).toBe('Closing balance ₹44,319 · ledger ₹43,000');
  });

  it('shows the closing balance alone when the server could not compare', () => {
    expect(ledgerLine(44319, null, null)).toBe('Closing balance ₹44,319');
    expect(ledgerLine(44319, false, null)).toBe('Closing balance ₹44,319');
  });

  it('has no line without a closing balance', () => {
    expect(ledgerLine(null, true, 1)).toBeNull();
  });
});

describe('buildLineRow', () => {
  it('marks a matched debit as linked with two decimals and no sign', () => {
    expect(buildLineRow(line())).toMatchObject({
      date: '9 Sep',
      amount: '24,990.00',
      credit: false,
      linked: true,
      phoneSub: '9 Sep · linked to transaction',
    });
  });

  it('marks a created line as new', () => {
    const row = buildLineRow(line({ origin: 'created' }));
    expect(row.linked).toBe(false);
    expect(row.phoneSub).toBe('9 Sep · created from this statement');
  });

  it('shows a credit with a plus and calls it a credit', () => {
    const row = buildLineRow(line({ type: 'CREDIT', amount: 45, origin: 'created' }));
    expect(row).toMatchObject({ amount: '+45.00', credit: true, phoneSub: '9 Sep · credit' });
  });
});

describe('buildDetailModel', () => {
  const bill: CardBillResponse = {
    accountId: 'c1',
    accountName: 'Card',
    muted: false,
    paidSource: 'NONE',
    status: 'OPEN',
    paidAmount: 500,
    paymentDueDate: '2026-10-26',
  };

  it('builds the card detail: title, subtitle, stats from the statement and the bill', () => {
    const m = buildDetailModel(detail(), bill, true);
    expect(m.title).toBe('Statement · 5 Oct 2026');
    expect(m.subtitle).toEqual([
      'Period 6 Sep → 5 Oct',
      'Regalia-Gold-statement.pdf',
      'uploaded 13 Oct',
    ]);
    expect(m.stats).toEqual([
      { label: 'Total due', value: '₹44,319' },
      { label: 'Minimum', value: '₹2,500' },
      { label: 'Paid so far', value: '₹500' },
    ]);
    expect(m.dueDate).toBe('2026-10-26');
    expect(m.ledgerLine).toBe('Closing balance ₹44,319 · matches ledger');
    expect(m.lines).toHaveLength(2);
  });

  it('shows Paid so far as a dash without a bill, and falls back to the statement due date', () => {
    const m = buildDetailModel(detail(), null, true);
    expect(m.stats[2]).toEqual({ label: 'Paid so far', value: '—' });
    expect(m.dueDate).toBe('2026-10-25');
  });

  it('shows Paid so far as zero when the bill has no paid amount', () => {
    const m = buildDetailModel(detail(), { ...bill, paidAmount: null }, true);
    expect(m.stats[2]).toEqual({ label: 'Paid so far', value: '₹0' });
  });

  it('builds the bank detail with opening, closing and lines', () => {
    const m = buildDetailModel(detail({ cardDetails: undefined, transactionCount: 14 }), null, false);
    expect(m.stats).toEqual([
      { label: 'Opening', value: '₹46,800' },
      { label: 'Closing', value: '₹44,319' },
      { label: 'Lines', value: '14' },
    ]);
    expect(m.isCard).toBe(false);
  });

  it('leaves the file name out for an emailed statement', () => {
    const m = buildDetailModel(detail({ source: 'gmail', sourceRef: '18f3a9' }), null, true);
    expect(m.subtitle).not.toContain('18f3a9');
  });

  it('words the skipped-lines banner, singular and plural, and omits it at zero', () => {
    expect(buildDetailModel(detail({ linesSkipped: 2 }), null, true).skippedBanner).toBe(
      '2 lines were skipped.'
    );
    expect(buildDetailModel(detail({ linesSkipped: 1 }), null, true).skippedBanner).toBe(
      '1 line was skipped.'
    );
    expect(buildDetailModel(detail({ linesSkipped: 0 }), null, true).skippedBanner).toBeNull();
  });

  it('carries the checksum verdict', () => {
    expect(buildDetailModel(detail({ checksumOk: false }), null, true).checksumOk).toBe(false);
    expect(buildDetailModel(detail({ checksumOk: null }), null, true).checksumOk).toBeNull();
  });
});

describe('deletionImpact', () => {
  it('lists what goes and what stays from the preview counts', () => {
    const items = deletionImpact({
      transactionsToDelete: 6,
      linkedToRecords: 1,
      transactionsKept: 2,
      alertsToReopen: 2,
    });
    expect(items).toEqual([
      '6 transactions it created will be deleted.',
      '1 of them is linked to a loan, lending, dividend or transfer. Those records stay but lose the link.',
      '2 transactions it only matched (email alerts, manual entries, or rows another statement also covers) will stay.',
      '2 email alerts go back to review as unreconciled.',
    ]);
  });

  it('says none are deleted and skips the zero lines', () => {
    expect(
      deletionImpact({ transactionsToDelete: 0, linkedToRecords: 0, transactionsKept: 0, alertsToReopen: 0 })
    ).toEqual(['It created no transactions that only this statement covers, so none will be deleted.']);
  });
});

describe('deletionNote', () => {
  it('differs for an emailed statement', () => {
    expect(deletionNote('file_upload')).toBe('You can upload the same file again afterwards.');
    expect(deletionNote('gmail')).toMatch(/Gmail won't fetch/);
  });
});
