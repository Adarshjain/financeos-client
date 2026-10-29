import { describe, expect, it } from 'vitest';

import type { LoanMatchSuggestions, LoanResponse, LoansSummaryDetail } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';
import { pinClock } from '@/test/pinClock';

import {
  closedLoansLine,
  joinDates,
  loanRow,
  loansHero,
  loansUrl,
  matchBanner,
  nextCell,
  nextEmiDate,
  numberWord,
  paidToast,
  parseLoansUrl,
  singleCandidateBatches,
} from './loansListModel';

pinClock();

const TODAY = '2026-10-21';

function loan(over: Partial<LoanResponse> = {}): LoanResponse {
  return {
    id: 'l1',
    name: 'Home Loan · SBI MaxGain',
    loanType: 'home',
    rateType: 'floating',
    currentAnnualRatePct: 8.25,
    currentEmi: 36603,
    outstandingPrincipal: 4192327,
    totalInstallments: 240,
    settledInstallments: 13,
    nextDueDate: '2026-10-05',
    projectedEndDate: '2045-01-05',
    status: 'active',
    ...over,
  } as LoanResponse;
}

const summary: LoansSummaryDetail = {
  totalOutstanding: 5050000,
  activeLoanCount: 3,
  lentOutstanding: 0,
  borrowedOutstanding: 1200000,
  netReceivable: 0,
  borrowedPrincipal: 5550000,
  monthlyEmiTotal: 63954,
  emiDueDays: [10, 5, 7, 5],
  overdueAmount: 63954,
  overdueCount: 3,
  interestPaidThisFy: 388210,
  fyStart: '2026-04-01',
  closedLoanCount: 1,
};

describe('URL state', () => {
  it('parses defaults and rejects junk', () => {
    expect(parseLoansUrl({})).toEqual({ q: '', page: 0, size: 25 });
    expect(parseLoansUrl({ q: ' sbi ', page: '4', size: '100' })).toEqual({ q: 'sbi', page: 3, size: 100 });
    expect(parseLoansUrl({ page: 'x', size: '10' })).toEqual({ q: '', page: 0, size: 25 });
  });

  it('builds the tab URL with only non-default parts', () => {
    expect(loansUrl({ q: '', page: 0, size: 25 })).toBe('/loans');
    expect(loansUrl({ q: 'sbi', page: 2, size: 50 })).toBe('/loans?q=sbi&page=3&size=50');
  });
});

describe('loansHero', () => {
  it('puts total outstanding in the hero with the overdue amount as its change line', () => {
    expect(loansHero(summary, TODAY)).toEqual({
      label: 'Total outstanding',
      value: '₹50,50,000',
      change: { text: '₹63,954 overdue · 3 EMIs', tone: 'danger' },
      figures: [
        { label: 'EMIs a month', value: '₹63,954' },
        { label: 'Next EMI', value: '5 Nov' },
      ],
    });
  });

  it('has no change line when nothing is overdue', () => {
    expect(loansHero({ ...summary, overdueAmount: 0, overdueCount: 0 }, TODAY).change).toBeUndefined();
  });

  it('copes with no loans', () => {
    const none = loansHero({ ...summary, activeLoanCount: 0, emiDueDays: [], monthlyEmiTotal: 0 }, TODAY);
    expect(none.figures).toEqual([
      { label: 'EMIs a month', value: '₹0' },
      { label: 'Next EMI', value: '—' },
    ]);
  });
});

describe('nextEmiDate', () => {
  it('is the first EMI day from today on, else the first one of next month', () => {
    expect(nextEmiDate([10, 5, 7], '2026-10-06')).toBe('2026-10-07');
    expect(nextEmiDate([10, 5, 7], '2026-10-21')).toBe('2026-11-05');
    expect(nextEmiDate([5], '2026-12-21')).toBe('2027-01-05');
    expect(nextEmiDate([31], '2026-11-02')).toBe('2026-11-30');
    expect(nextEmiDate([], '2026-10-21')).toBeNull();
  });
});

describe('nextCell and loanRow', () => {
  it('flags an installment past due as "#n overdue"', () => {
    expect(nextCell(loan(), TODAY)).toEqual({ kind: 'overdue', label: '#14 overdue' });
  });

  it('shows the due day when it is today or later', () => {
    expect(nextCell(loan({ nextDueDate: '2026-10-21' }), TODAY)).toEqual({ kind: 'date', label: '21 Oct' });
    expect(nextCell(loan({ nextDueDate: '2026-11-05' }), TODAY)).toEqual({ kind: 'date', label: '5 Nov' });
  });

  it('shows nothing without a due date and names closed loans', () => {
    expect(nextCell(loan({ nextDueDate: null }), TODAY)).toEqual({ kind: 'none' });
    expect(nextCell(loan({ status: 'closed' }), TODAY)).toEqual({ kind: 'status', label: 'Closed' });
    expect(nextCell(loan({ status: 'foreclosed' }), TODAY)).toEqual({ kind: 'status', label: 'Foreclosed' });
  });

  it('draws a loan row as the board does', () => {
    expect(loanRow(loan(), TODAY)).toMatchObject({
      id: 'l1',
      name: 'Home Loan · SBI MaxGain',
      kind: 'home',
      rate: '8.25% floating',
      lender: null,
      emi: '36,603',
      outstanding: '41,92,327',
      progressText: '13 of 240 · ends January 2045',
      next: { kind: 'overdue', label: '#14 overdue' },
      phoneSub: '8.25% · EMI ₹36,603 · 13 of 240 paid',
      closed: false,
      href: '/loans/l1',
    });
    expect(loanRow(loan(), TODAY).progressPct).toBeCloseTo(5.42, 1);
  });

  it('writes whole percentages without decimals and underscores as spaces', () => {
    const row = loanRow(loan({ currentAnnualRatePct: 14, rateType: 'fixed', loanType: 'two_wheeler', projectedEndDate: null }), TODAY);
    expect(row.rate).toBe('14% fixed');
    expect(row.kind).toBe('two wheeler');
    expect(row.progressText).toBe('13 of 240');
  });

  it('marks closed loans and survives a zero tenure', () => {
    const row = loanRow(loan({ status: 'closed', totalInstallments: 0, settledInstallments: 0 }), TODAY);
    expect(row.closed).toBe(true);
    expect(row.progressPct).toBe(0);
  });

  it('rounds the money to whole rupees and carries the lender', () => {
    const row = loanRow(loan({ outstandingPrincipal: 574156.02, currentEmi: 17748.4, lender: ' SBI ' }), TODAY);
    expect(row.outstanding).toBe('5,74,156');
    expect(row.emi).toBe('17,748');
    expect(row.lender).toBe('SBI');
  });

  it('closedLoansLine reads "Closed · n" or nothing', () => {
    expect(closedLoansLine(1)).toBe('Closed · 1');
    expect(closedLoansLine(0)).toBeNull();
  });
});

describe('EMI matching', () => {
  const tx = (id: string, date: string, amount = -36603) => ({ id, date, amount, accountId: 'a1' }) as Transaction;
  const matches: LoanMatchSuggestions[] = [
    {
      loanId: 'l1',
      loanName: 'Home Loan',
      suggestions: [
        { installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 36603, candidates: [tx('t1', '2026-10-05')] },
        { installmentSeq: 15, dueDate: '2026-11-05', expectedAmount: 36603, candidates: [tx('t9', '2026-11-04'), tx('t10', '2026-11-06')] },
      ],
    },
    {
      loanId: 'l2',
      loanName: 'Car Loan',
      suggestions: [{ installmentSeq: 8, dueDate: '2026-10-07', expectedAmount: 17748, candidates: [tx('t2', '2026-10-07', -17748)] }],
    },
    { loanId: 'l3', loanName: 'Personal', suggestions: [{ installmentSeq: 20, dueDate: '2026-10-10', expectedAmount: 9603, candidates: [tx('t3', '2026-10-10', -9603)] }] },
  ];

  it('confirms only installments with exactly one candidate, per loan', () => {
    expect(singleCandidateBatches(matches)).toEqual([
      { loanId: 'l1', items: [{ installmentSeq: 14, paymentDate: '2026-10-05', amount: 36603, transactionId: 't1' }] },
      { loanId: 'l2', items: [{ installmentSeq: 8, paymentDate: '2026-10-07', amount: 17748, transactionId: 't2' }] },
      { loanId: 'l3', items: [{ installmentSeq: 20, paymentDate: '2026-10-10', amount: 9603, transactionId: 't3' }] },
    ]);
  });

  it('words the banner in the board pattern: month, count in words, debit dates', () => {
    expect(matchBanner(matches)).toEqual({
      count: 3,
      message: 'October EMIs are not marked paid. Three bank debits on 5, 7 and 10 Oct match them.',
      actionLabel: 'Link all three',
    });
  });

  it('leads with the count when the installments fall in different months', () => {
    const mixed = [
      { ...matches[0], suggestions: [matches[0].suggestions[0]] },
      { ...matches[1], suggestions: [{ ...matches[1].suggestions[0], dueDate: '2026-09-07' }] },
    ];
    expect(matchBanner(mixed)).toMatchObject({
      message: 'Two EMIs are not marked paid. Two bank debits on 5 and 7 Oct match them.',
      actionLabel: 'Link all two',
    });
  });

  it('writes counts above ten as digits', () => {
    const many: LoanMatchSuggestions[] = Array.from({ length: 11 }, (_, i) => ({
      loanId: `l${i}`,
      loanName: 'x',
      suggestions: [{ installmentSeq: 1, dueDate: '2026-10-05', expectedAmount: 1, candidates: [tx(`t${i}`, '2026-10-05', -1)] }],
    }));
    expect(matchBanner(many)).toMatchObject({ message: expect.stringContaining('11 bank debits on 5 Oct match them.'), actionLabel: 'Link all 11' });
    expect(numberWord(10)).toBe('ten');
    expect(numberWord(11)).toBe('11');
  });

  it('words a single match in the singular', () => {
    expect(matchBanner([{ ...matches[0], suggestions: [matches[0].suggestions[1]] }])).toBeNull();
    expect(matchBanner([matches[2]])).toEqual({
      count: 1,
      message: 'October EMI is not marked paid. One bank debit on 10 Oct matches it.',
      actionLabel: 'Link it',
    });
  });

  it('shows no banner when nothing has exactly one candidate', () => {
    expect(matchBanner([])).toBeNull();
    expect(matchBanner([{ loanId: 'l', loanName: 'x', suggestions: [{ installmentSeq: 1, dueDate: '2026-10-01', expectedAmount: 1, candidates: [] }] }])).toBeNull();
    expect(singleCandidateBatches([])).toEqual([]);
  });

  it('joinDates writes the month once per run', () => {
    expect(joinDates(['2026-10-10', '2026-10-05', '2026-10-07'])).toBe('5, 7 and 10 Oct');
    expect(joinDates(['2026-09-30', '2026-10-05', '2026-10-07'])).toBe('30 Sep, 5 and 7 Oct');
    expect(joinDates(['2026-10-05'])).toBe('5 Oct');
    expect(joinDates(['2026-10-05', '2026-10-05'])).toBe('5 Oct');
    expect(joinDates([])).toBe('');
  });

  it('paidToast counts the EMIs', () => {
    expect(paidToast(1)).toBe('Marked 1 EMI paid');
    expect(paidToast(3)).toBe('Marked 3 EMIs paid');
  });
});
