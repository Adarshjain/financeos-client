import { describe, expect, it } from 'vitest';

import type { CardBillResponse } from '@/lib/api/types';

import {
  buildDetailModel,
  buildDetails,
  buildLineRow,
  checkDetails,
  deletionImpact,
  deletionNote,
  detailsFormFrom,
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
    missingDetails: [],
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

describe('statement lines', () => {
  it('carries the position, review status, balance after and chain state', () => {
    const row = buildLineRow(
      line({ lineIndex: 0, reviewType: 'NEEDS_REVIEW', balanceAfter: 12500, chainValid: false })
    );
    expect(row).toMatchObject({
      index: '1',
      review: { label: 'Needs review', tone: 'warning' },
      balanceAfter: '₹12,500',
      chain: 'broken',
    });
    expect(row.phoneSub).toBe('9 Sep · linked to transaction · balance ₹12,500');
  });

  it.each([
    ['AUTO_REVIEWED', 'Auto reviewed', 'success'],
    ['MANUALLY_REVIEWED', 'Manually reviewed', 'info'],
  ] as const)('labels %s', (reviewType, label, tone) => {
    expect(buildLineRow(line({ reviewType })).review).toEqual({ label, tone });
  });

  it('leaves review, balance and chain empty when the server sends none', () => {
    const row = buildLineRow(line({ reviewType: 'NA', balanceAfter: null, chainValid: null }));
    expect(row).toMatchObject({ index: '', review: null, balanceAfter: '—', chain: null });
    expect(row.phoneSub).toBe('9 Sep · linked to transaction');
    expect(buildLineRow(line({ chainValid: true })).chain).toBe('valid');
  });
});

describe('buildDetails', () => {
  it('lists every credit card figure, then parse mode, chain validation and source', () => {
    const d = detail({
      parseMode: 'llm',
      chainValidationPct: 99.54,
      cardDetails: {
        totalAmountDue: 44319,
        paymentDueDate: '2026-10-25',
        creditLimit: 300000,
        availableCreditLimit: 255681,
        financeCharges: 0,
        feesAndCharges: 590,
        previousBalance: 46800,
        paymentsReceived: 46800,
        totalPurchases: 44319,
        rewardPointsBalance: 12480,
        rewardPointsEarned: 1560,
      },
    });
    expect(buildDetails(d, true)).toEqual([
      { label: 'Due date', value: '25 Oct 2026' },
      { label: 'Credit limit', value: '₹3,00,000' },
      { label: 'Available credit', value: '₹2,55,681' },
      { label: 'Finance charges', value: '₹0' },
      { label: 'Fees and charges', value: '₹590' },
      { label: 'Previous balance', value: '₹46,800' },
      { label: 'Payments received', value: '₹46,800' },
      { label: 'Total purchases', value: '₹44,319' },
      { label: 'Reward points balance', value: '12,480' },
      { label: 'Points earned', value: '+1,560' },
      { label: 'Parse mode', value: 'llm' },
      { label: 'Chain validation', value: '99.5% valid' },
      { label: 'Ingestion source', value: 'File upload' },
    ]);
  });

  it('leaves out figures the statement does not carry, keeping real zeros', () => {
    const d = detail({ cardDetails: { creditLimit: 300000, financeCharges: 0, rewardPointsBalance: null } });
    expect(buildDetails(d, true).map((x) => x.label)).toEqual([
      'Credit limit',
      'Finance charges',
      'Parse mode',
      'Ingestion source',
    ]);
  });

  it('has only parse mode and source for a bank statement without chain validation', () => {
    expect(buildDetails(detail({ source: 'gmail' }), false)).toEqual([
      { label: 'Parse mode', value: 'Standard' },
      { label: 'Ingestion source', value: 'Gmail' },
    ]);
  });
});

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
    missingDetails: [],
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

  it('carries the dialog values and the missing-details sentence for a card', () => {
    const m = buildDetailModel(
      detail({
        missingDetails: ['PERIOD_END', 'DUE_DATE', 'TOTAL_DUE', 'MINIMUM_DUE'],
      }),
      bill,
      true
    );
    expect(m.periodStart).toBe('2026-09-06');
    expect(m.periodEnd).toBe('2026-10-05');
    expect(m.totalDue).toBe(44319);
    expect(m.minimumDue).toBe(2500);
    expect(m.missing).toEqual([
      'PERIOD_END',
      'DUE_DATE',
      'TOTAL_DUE',
      'MINIMUM_DUE',
    ]);
    expect(m.missingBanner).toBe(
      'Missing from this statement: period end, due date, total due, minimum due.'
    );
  });

  it('has no missing-details sentence when complete or for a bank statement', () => {
    expect(buildDetailModel(detail(), bill, true).missingBanner).toBeNull();
    const bank = buildDetailModel(
      detail({ cardDetails: undefined, missingDetails: ['DUE_DATE'] }),
      null,
      false
    );
    expect(bank.missing).toEqual([]);
    expect(bank.missingBanner).toBeNull();
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

describe('checkDetails', () => {
  const initial = {
    periodStart: '2026-09-06',
    periodEnd: '2026-10-05',
    dueDate: '2026-10-25',
    totalDue: 44319,
    minimumDue: 2500,
  };
  const form = (over: Partial<Record<keyof typeof initial, string>> = {}) => ({
    ...detailsFormFrom(initial),
    ...over,
  });

  it('prefills from the statement', () => {
    expect(detailsFormFrom(initial)).toEqual({
      periodStart: '2026-09-06',
      periodEnd: '2026-10-05',
      dueDate: '2026-10-25',
      totalDue: '44319',
      minimumDue: '2500',
    });
  });

  it('sends only the changed fields', () => {
    const r = checkDetails(
      form({ dueDate: '2026-10-30', minimumDue: '3000' }),
      initial
    );
    expect(r.errors).toEqual({});
    expect(r.body).toEqual({
      paymentDueDate: '2026-10-30',
      minimumAmountDue: 3000,
    });
  });

  it('asks for a change when nothing differs', () => {
    expect(checkDetails(form(), initial).errors.form).toBe(
      'Change at least one of the fields'
    );
  });

  it('rejects a start after the end', () => {
    expect(
      checkDetails(form({ periodStart: '2026-10-06' }), initial).errors
        .periodStart
    ).toBe('Period start must be on or before period end');
  });

  it('rejects a period longer than 400 days', () => {
    expect(
      checkDetails(form({ periodStart: '2025-01-01' }), initial).errors
        .periodStart
    ).toBe('Statement period cannot be longer than 400 days');
    expect(
      checkDetails(form({ periodStart: '2025-09-01' }), initial).errors
        .periodStart
    ).toBeUndefined();
  });

  it('rejects a due date before the period end or more than 60 days after', () => {
    const msg = 'Due date must be 0 to 60 days after the period end';
    expect(
      checkDetails(form({ dueDate: '2026-10-04' }), initial).errors.dueDate
    ).toBe(msg);
    expect(
      checkDetails(form({ dueDate: '2026-12-05' }), initial).errors.dueDate
    ).toBe(msg);
    expect(
      checkDetails(form({ dueDate: '2026-12-04' }), initial).errors.dueDate
    ).toBeUndefined();
  });

  it('checks the due window when only the period end moves', () => {
    expect(
      checkDetails(form({ periodEnd: '2026-10-26' }), initial).errors.dueDate
    ).toBe('Due date must be 0 to 60 days after the period end');
  });

  it('does not block a due date because an old total and minimum are odd', () => {
    const odd = { ...initial, minimumDue: 99999 };
    const r = checkDetails(
      { ...detailsFormFrom(odd), dueDate: '2026-10-30' },
      odd
    );
    expect(r.errors).toEqual({});
    expect(r.body).toEqual({ paymentDueDate: '2026-10-30' });
  });

  it('rejects a minimum above the total', () => {
    expect(
      checkDetails(form({ minimumDue: '50000' }), initial).errors.minimumDue
    ).toBe('Minimum due cannot exceed total due');
    expect(
      checkDetails(form({ totalDue: '1000' }), initial).errors.minimumDue
    ).toBe('Minimum due cannot exceed total due');
  });

  it('rejects negative amounts', () => {
    expect(
      checkDetails(form({ totalDue: '-1' }), initial).errors.totalDue
    ).toBe('Total due cannot be negative');
    expect(
      checkDetails(form({ minimumDue: '-1' }), initial).errors.minimumDue
    ).toBe('Minimum due cannot be negative');
  });

  it('does not let a set field be cleared, but leaves a missing one empty', () => {
    expect(checkDetails(form({ dueDate: '' }), initial).errors.dueDate).toBe(
      'Enter the due date'
    );
    const missing = { ...initial, dueDate: null };
    const r = checkDetails(
      { ...detailsFormFrom(missing), totalDue: '45000' },
      missing
    );
    expect(r.errors).toEqual({});
    expect(r.body).toEqual({ totalAmountDue: 45000 });
  });

  it('fills a missing due date', () => {
    const missing = { ...initial, dueDate: null };
    const r = checkDetails(
      { ...detailsFormFrom(missing), dueDate: '2026-10-20' },
      missing
    );
    expect(r.body).toEqual({ paymentDueDate: '2026-10-20' });
  });
});
