import { describe, expect, it } from 'vitest';

import { pinClock } from '@/test/pinClock';

import { eventFixture, installment, loanFixture, scheduleFixture, TODAY } from './loanDetail.fixtures';
import {
  emiChange,
  linkedLine,
  loanHeader,
  loanHero,
  monthsSaved,
  nextEmi,
  repaidPct,
  termsLocked,
} from './loanDetailModel';

pinClock();

describe('loanHeader', () => {
  it('shows the lender while the loan is active', () => {
    expect(loanHeader(loanFixture(), scheduleFixture(), TODAY).info).toBe('State Bank of India');
  });

  it('shows nothing when there is no lender', () => {
    expect(loanHeader(loanFixture({ lender: null }), [], TODAY).info).toBeNull();
  });

  it('names closed and foreclosed loans instead of the lender', () => {
    expect(loanHeader(loanFixture({ status: 'closed' }), [], TODAY).info).toBe('Closed');
    expect(loanHeader(loanFixture({ status: 'foreclosed' }), [], TODAY).info).toBe('Foreclosed');
  });
});

describe('nextEmi', () => {
  it('leads with the first overdue EMI and how long ago it was due', () => {
    expect(nextEmi(loanFixture(), scheduleFixture(), '2026-10-13')).toEqual({
      eyebrow: 'EMI #14 overdue',
      amount: '₹36,603.00',
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
      amount: '₹36,603.00',
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

describe('hero', () => {
  const hero = (over = {}, events: ReturnType<typeof eventFixture>[] = []) => {
    const loan = loanFixture(over);
    return loanHero(loan, events, nextEmi(loan, scheduleFixture(), TODAY));
  };

  it('Outstanding is to the paisa and the bar says how much is repaid of the principal', () => {
    const h = hero();
    expect(h.outstanding).toBe('₹41,92,327.00');
    expect(h.timeline.today).toBe('Today · 6.8% of ₹45,00,000 repaid');
    expect(repaidPct(loanFixture())).toBeCloseTo(6.837, 2);
    expect(repaidPct(loanFixture({ principal: 0 }))).toBe(0);
  });

  it('EMI says what it was only when it changed, and why', () => {
    const cut = [eventFixture({ id: 'r', eventType: 'rate_change', effectiveDate: '2026-08-01', newAnnualRatePct: 8.25, adjustmentMode: 'reduce_emi' })];
    expect(hero({}, cut).figures[0]).toEqual({
      label: 'EMI',
      value: '₹36,603.00',
      caption: 'was ₹39,052.00 before the rate cut',
    });
    expect(hero({ currentEmi: 39052 }, cut).figures[0].caption).toBeUndefined();
  });

  it('names a rate rise and a prepayment that reduced the EMI', () => {
    const rise = [eventFixture({ id: 'r', eventType: 'rate_change', newAnnualRatePct: 9.5, adjustmentMode: 'reduce_tenure' })];
    expect(emiChange(loanFixture({ currentEmi: 41000 }), rise)).toEqual({ was: 39052, cause: 'rate rise' });
    const prepay = [eventFixture({ id: 'p', adjustmentMode: 'reduce_emi' })];
    expect(emiChange(loanFixture(), prepay)).toEqual({ was: 39052, cause: 'prepayment' });
  });

  it('reads each rate change against the one before it', () => {
    const events = [
      eventFixture({ id: 'a', eventType: 'rate_change', effectiveDate: '2026-02-01', newAnnualRatePct: 9, adjustmentMode: 'reduce_emi' }),
      eventFixture({ id: 'b', eventType: 'rate_change', effectiveDate: '2026-08-01', newAnnualRatePct: 8.25, adjustmentMode: 'reduce_emi' }),
    ];
    expect(emiChange(loanFixture(), events)?.cause).toBe('rate cut');
  });

  it('Rate shows the current rate and its type', () => {
    expect(hero().figures[1]).toEqual({ label: 'Rate', value: '8.25% floating' });
  });

  it('Months left counts the unpaid EMIs and names months saved only when there are some', () => {
    expect(hero({ totalInstallments: 233 }).figures[2]).toEqual({
      label: 'Months left',
      value: '220',
      caption: '7 months saved by prepayment',
    });
    expect(monthsSaved(loanFixture({ totalInstallments: 239 }))).toBe(1);
    expect(hero({ totalInstallments: 239 }).figures[2].caption).toBe('1 month saved by prepayment');
    expect(hero({ totalInstallments: 240 }).figures[2].caption).toBeUndefined();
    expect(hero({ totalInstallments: 250 }).figures[2].caption).toBeUndefined();
  });

  it('carries the next EMI line, red when overdue, and none for a closed loan', () => {
    const overdue = loanHero(loanFixture(), [], nextEmi(loanFixture(), scheduleFixture(), '2026-12-01'));
    expect(overdue.next?.text.startsWith('EMI #')).toBe(true);
    expect(hero({ status: 'closed' }).next).toBeNull();
  });

  it('the bar runs from the start month to the end month', () => {
    expect(hero().timeline).toMatchObject({
      pct: expect.closeTo(6.837, 2),
      start: 'August 2025',
      end: 'January 2045',
    });
    expect(hero({ projectedEndDate: null }).timeline.end).toBe('—');
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
