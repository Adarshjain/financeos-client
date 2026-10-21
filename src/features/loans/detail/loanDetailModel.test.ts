import { describe, expect, it } from 'vitest';

import { eventFixture, installment, loanFixture, scheduleFixture, TODAY } from './loanDetail.fixtures';
import {
  emiChange,
  linkedLine,
  loanHeader,
  loanTiles,
  monthsSaved,
  nextEmi,
  repaidPct,
  shortDate,
  termsLocked,
} from './loanDetailModel';

describe('shortDate', () => {
  it('reads "1 Aug 25"', () => expect(shortDate('2025-08-01')).toBe('1 Aug 25'));
});

describe('loanHeader', () => {
  it('says the status and rate in words and lists the particulars in order', () => {
    const header = loanHeader(loanFixture(), scheduleFixture(), 'HDFC Bank Savings', TODAY);
    expect(header.status).toEqual({ label: 'Active', tone: 'success' });
    expect(header.rate).toBe('Floating 8.25%');
    expect(header.meta).toBe(
      'State Bank of India · #SBIHL00482913 · started 1 Aug 25 · ends Jan 45 · paid from HDFC Bank Savings',
    );
  });

  it('leaves out what the loan does not have', () => {
    const header = loanHeader(
      loanFixture({ lender: null, loanAccountNumber: null, projectedEndDate: null, rateType: 'fixed', currentAnnualRatePct: 9 }),
      [],
      null,
      TODAY,
    );
    expect(header.rate).toBe('Fixed 9%');
    expect(header.meta).toBe('started 1 Aug 25');
  });

  it('names closed and foreclosed loans', () => {
    expect(loanHeader(loanFixture({ status: 'closed' }), [], null, TODAY).status).toEqual({ label: 'Closed', tone: 'neutral' });
    expect(loanHeader(loanFixture({ status: 'foreclosed' }), [], null, TODAY).status).toEqual({
      label: 'Foreclosed',
      tone: 'danger',
    });
  });
});

describe('nextEmi', () => {
  it('leads with the first overdue EMI and how long ago it was due', () => {
    expect(nextEmi(loanFixture(), scheduleFixture(), '2026-10-13')).toEqual({
      eyebrow: 'EMI #14 overdue',
      amount: '₹36,603',
      overdue: true,
      context: 'was due 5 Oct · 8 days ago',
    });
  });

  it('says 1 day, not 1 days', () => {
    expect(nextEmi(loanFixture(), scheduleFixture(), '2026-10-06')?.context).toBe('was due 5 Oct · 1 day ago');
  });

  it('falls back to the next EMI when nothing is overdue', () => {
    const schedule = scheduleFixture().map((i) => (i.seq === 14 ? { ...i, status: 'settled' as const } : i));
    expect(nextEmi(loanFixture(), schedule, '2026-10-13')).toEqual({
      eyebrow: 'EMI #15 due',
      amount: '₹36,603',
      overdue: false,
      context: 'due 5 Nov · in 23 days',
    });
  });

  it('says today when it falls due today', () => {
    const schedule = [installment(15, '2026-10-13')];
    expect(nextEmi(loanFixture(), schedule, '2026-10-13')?.context).toBe('due today · 13 Oct');
  });

  it('shows nothing for a closed loan or a fully paid schedule', () => {
    expect(nextEmi(loanFixture({ status: 'closed' }), scheduleFixture(), TODAY)).toBeNull();
    expect(nextEmi(loanFixture(), [], TODAY)).toBeNull();
  });
});

describe('tiles', () => {
  it('Outstanding says what was borrowed and how much is repaid', () => {
    const [outstanding] = loanTiles(loanFixture(), []).tiles;
    expect(outstanding).toEqual({ label: 'Outstanding', value: '₹41,92,327', context: 'of ₹45,00,000 · 6.8% repaid' });
    expect(repaidPct(loanFixture())).toBeCloseTo(6.837, 2);
  });

  it('Outstanding has no repaid share without a principal', () => {
    const [outstanding] = loanTiles(loanFixture({ principal: 0, outstandingPrincipal: 0 }), []).tiles;
    expect(outstanding.context).toBeUndefined();
    expect(repaidPct(loanFixture({ principal: 0 }))).toBe(0);
  });

  it('Current EMI says what it was only when it changed, and why', () => {
    const cut = [eventFixture({ id: 'r', eventType: 'rate_change', effectiveDate: '2026-08-01', newAnnualRatePct: 8.25, adjustmentMode: 'reduce_emi' })];
    expect(loanTiles(loanFixture(), cut).tiles[1]).toEqual({
      label: 'Current EMI',
      value: '₹36,603',
      context: 'was ₹39,052 before the rate cut',
    });
    expect(loanTiles(loanFixture({ currentEmi: 39052 }), cut).tiles[1].context).toBeUndefined();
  });

  it('names a rate rise and a prepayment that reduced the EMI', () => {
    const rise = [eventFixture({ id: 'r', eventType: 'rate_change', newAnnualRatePct: 9.5, adjustmentMode: 'reduce_tenure' })];
    expect(emiChange(loanFixture({ currentEmi: 41000 }), rise)).toEqual({ was: 39052, cause: 'rate rise' });
    const prepay = [eventFixture({ id: 'p', adjustmentMode: 'reduce_emi' })];
    expect(emiChange(loanFixture(), prepay)).toEqual({ was: 39052, cause: 'prepayment' });
  });

  it('Current EMI reads each rate change against the one before it', () => {
    const events = [
      eventFixture({ id: 'a', eventType: 'rate_change', effectiveDate: '2026-02-01', newAnnualRatePct: 9, adjustmentMode: 'reduce_emi' }),
      eventFixture({ id: 'b', eventType: 'rate_change', effectiveDate: '2026-08-01', newAnnualRatePct: 8.25, adjustmentMode: 'reduce_emi' }),
    ];
    expect(emiChange(loanFixture(), events)?.cause).toBe('rate cut');
  });

  it('Interest paid shows the effective APR when the server has one', () => {
    expect(loanTiles(loanFixture(), []).tiles[2]).toEqual({
      label: 'Interest paid',
      value: '₹4,02,834',
      context: 'effective APR 8.72%',
    });
    expect(loanTiles(loanFixture({ effectiveAprPct: null }), []).tiles[2].context).toBeUndefined();
  });

  it('Timeline counts paid of total and names months saved only when there are some', () => {
    expect(loanTiles(loanFixture({ totalInstallments: 233 }), []).tiles[3]).toEqual({
      label: 'Timeline',
      value: '13 / 233',
      context: '7 months saved by prepayment',
    });
    expect(monthsSaved(loanFixture({ totalInstallments: 239 }))).toBe(1);
    expect(loanTiles(loanFixture({ totalInstallments: 239 }), []).tiles[3].context).toBe('1 month saved by prepayment');
    expect(loanTiles(loanFixture({ totalInstallments: 240 }), []).tiles[3].context).toBeUndefined();
    expect(loanTiles(loanFixture({ totalInstallments: 250 }), []).tiles[3].context).toBeUndefined();
  });

  it('the bar runs from the start month to the end month with today in the middle', () => {
    expect(loanTiles(loanFixture(), []).timeline).toEqual({
      pct: expect.closeTo(6.837, 2),
      start: 'Aug 25',
      today: 'Today · EMI 13 settled',
      end: 'Jan 45',
    });
    expect(loanTiles(loanFixture({ projectedEndDate: null }), []).timeline.end).toBe('—');
  });
});

describe('matching and locks', () => {
  it('counts the paid EMIs that point at a bank transaction', () => {
    expect(linkedLine(scheduleFixture())).toBe('3 of 3 paid EMIs');
    const noLink = scheduleFixture().map((i) => (i.seq === 12 ? { ...i, payment: { ...i.payment!, transactionId: undefined } } : i));
    expect(linkedLine(noLink)).toBe('2 of 3 paid EMIs');
    expect(linkedLine([])).toBe('0 of 0 paid EMIs');
  });

  it('locks the core terms once an event or a paid EMI exists', () => {
    expect(termsLocked([], [installment(1, '2026-01-05')])).toBe(false);
    expect(termsLocked([eventFixture({})], [])).toBe(true);
    expect(termsLocked([], scheduleFixture())).toBe(true);
  });
});
