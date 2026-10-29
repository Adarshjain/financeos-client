import { fyRangeLabel, ordinal, type TileModel } from '@/features/loans/loanFormat';
import { LOANS_HREF } from '@/features/loans/loansLendingsTabs';
import { DEFAULT_PAGE_SIZE, parsePage, setPageParam } from '@/features/shell/pagination';
import { appHref } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import { formatCount, formatDate, formatMoney, formatPercent } from '@/lib/format';
import type { BatchLoanPaymentItem, LoanMatchSuggestions, LoanResponse, LoansSummaryDetail } from '@/lib/loan.types';

import { paymentItemFor } from '../loanPaymentsBatch';

// ---- URL state -------------------------------------------------------------

export const LOANS_SIZE_OPTIONS = [10, 25, 50];

export interface LoansUrlState {
  q: string;
  page: number;
  size: number;
}

export function parseLoansUrl(params: SearchParamsRecord): LoansUrlState {
  return {
    q: (first(params.q) ?? '').trim(),
    ...parsePage(params, { sizes: LOANS_SIZE_OPTIONS }),
  };
}

/** The Loans tab URL for a state: defaults stay out of the query string. */
export function loansUrl(state: LoansUrlState): string {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  setPageParam(query, state.page);
  if (state.size !== DEFAULT_PAGE_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${LOANS_HREF}?${text}` : LOANS_HREF;
}

// ---- Tiles -----------------------------------------------------------------

/**
 * The four Loans tiles. Outstanding is the sum of the active loans' outstanding (`totalOutstanding`; the
 * summary's `borrowedOutstanding` is the lendings figure), in lakh-compact form (the board's "₹50.5L");
 * a tile with nothing in it reads ₹0 with a plain "Nothing …" line.
 */
export function loanTiles(summary: LoansSummaryDetail, today: string): TileModel[] {
  const days = [...new Set(summary.emiDueDays)].sort((a, b) => a - b);
  const loans = formatCount(summary.activeLoanCount, ['loan', 'loans']);
  return [
    {
      label: 'Outstanding',
      value: formatMoney(summary.totalOutstanding, { compact: true }),
      context: `of ${formatMoney(summary.borrowedPrincipal, { compact: true })} borrowed`,
    },
    {
      label: 'EMIs per month',
      value: formatMoney(summary.monthlyEmiTotal),
      context: days.length > 0 ? `${loans} · ${days.map(ordinal).join(', ')}` : loans,
    },
    {
      label: 'Overdue',
      value: formatMoney(summary.overdueAmount),
      context: summary.overdueCount > 0 ? `${formatCount(summary.overdueCount, ['EMI', 'EMIs'])} unpaid` : 'Nothing overdue',
      tone: summary.overdueAmount > 0 ? 'danger' : undefined,
    },
    {
      label: 'Interest this FY',
      value: formatMoney(summary.interestPaidThisFy),
      context: fyRangeLabel(summary.fyStart, today),
    },
  ];
}

// ---- Rows ------------------------------------------------------------------

export type NextCell =
  | { kind: 'overdue'; label: string }
  | { kind: 'date'; label: string }
  | { kind: 'status'; label: string }
  | { kind: 'none' };

export interface LoanRow {
  id: string;
  name: string;
  /** The lender, or null. */
  lender: string | null;
  /** "home", "two wheeler". */
  kind: string;
  /** "8.25% floating". */
  rate: string;
  /** "36,603" */
  emi: string;
  /** "41,92,327" */
  outstanding: string;
  progressPct: number;
  /** "13 of 240 · ends Jan 45". */
  progressText: string;
  next: NextCell;
  /** "8.25% · EMI ₹36,603 · 13 of 240 paid". */
  phoneSub: string;
  closed: boolean;
  href: string;
}

function ratePct(pct: number): string {
  return formatPercent(pct, { decimals: 2 });
}

/** The next cell: "#14 overdue" for an active loan past its due date, else the due day; closed loans say so. */
export function nextCell(loan: LoanResponse, today: string): NextCell {
  if (loan.status !== 'active') {
    return { kind: 'status', label: loan.status === 'closed' ? 'Closed' : 'Foreclosed' };
  }
  if (!loan.nextDueDate) return { kind: 'none' };
  if (loan.nextDueDate < today) return { kind: 'overdue', label: `#${loan.settledInstallments + 1} overdue` };
  return { kind: 'date', label: formatDate(loan.nextDueDate, 'list') };
}

export function loanRow(loan: LoanResponse, today: string): LoanRow {
  const paid = `${loan.settledInstallments} of ${loan.totalInstallments}`;
  const rate = ratePct(loan.currentAnnualRatePct);
  const ends = loan.projectedEndDate ? ` · ends ${formatDate(loan.projectedEndDate, 'month')}` : '';
  return {
    id: loan.id,
    name: loan.name,
    lender: loan.lender?.trim() || null,
    kind: loan.loanType.replace(/_/g, ' '),
    rate: `${rate} ${loan.rateType}`,
    emi: formatMoney(loan.currentEmi, { symbol: false }),
    outstanding: formatMoney(loan.outstandingPrincipal, { symbol: false }),
    progressPct: loan.totalInstallments > 0 ? Math.min(100, (loan.settledInstallments / loan.totalInstallments) * 100) : 0,
    progressText: `${paid}${ends}`,
    next: nextCell(loan, today),
    phoneSub: `${rate} · EMI ${formatMoney(loan.currentEmi)} · ${paid} paid`,
    closed: loan.status !== 'active',
    href: appHref(`/loans/${loan.id}`),
  };
}

/** The "Closed · 1" line under the table; null when there are none. */
export function closedLoansLine(count: number): string | null {
  return count > 0 ? `Closed · ${count}` : null;
}

// ---- Matching banner ---------------------------------------------------------

export interface LoanMatchBatch {
  loanId: string;
  items: BatchLoanPaymentItem[];
}

/** What "Link all" confirms: per loan, the installments that have exactly one candidate debit. */
export function singleCandidateBatches(matches: readonly LoanMatchSuggestions[]): LoanMatchBatch[] {
  const batches: LoanMatchBatch[] = [];
  for (const loan of matches) {
    const items = loan.suggestions
      .filter((s) => s.candidates.length === 1)
      .map((s) => paymentItemFor(s.installmentSeq, s.candidates[0]));
    if (items.length > 0) batches.push({ loanId: loan.loanId, items });
  }
  return batches;
}

/** "5, 7 and 10 Oct", "30 Sep, 5 and 7 Oct": the month is written once per run of one month. */
export function joinDates(dates: readonly string[]): string {
  const sorted = [...new Set(dates)].sort();
  const labels = sorted.map((d, i) => {
    const day = String(Number(d.slice(8, 10)));
    const sameMonthNext = i + 1 < sorted.length && sorted[i + 1].slice(0, 7) === d.slice(0, 7);
    return sameMonthNext ? day : formatDate(d, 'list');
  });
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

export interface MatchBanner {
  count: number;
  message: string;
  actionLabel: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** One to ten in words, digits beyond. */
export function numberWord(n: number): string {
  return n >= 0 && n <= 10 ? NUMBER_WORDS[n] : String(n);
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The matching line above the table, in the board's pattern ("October EMIs are not marked paid. Three bank
 * debits on 5, 7 and 10 Oct match them." / "Link all three"); null when no installment has exactly one
 * candidate. The month is named when every installment is due in one month, else the count leads.
 */
export function matchBanner(matches: readonly LoanMatchSuggestions[]): MatchBanner | null {
  const debitDates: string[] = [];
  const dueMonths = new Set<string>();
  for (const loan of matches) {
    for (const s of loan.suggestions) {
      if (s.candidates.length !== 1) continue;
      debitDates.push(s.candidates[0].date);
      dueMonths.add(s.dueDate.slice(0, 7));
    }
  }
  const count = debitDates.length;
  if (count === 0) return null;
  const one = count === 1;
  const lead =
    dueMonths.size === 1
      ? `${MONTH_NAMES[Number([...dueMonths][0].slice(5, 7)) - 1]} ${one ? 'EMI is' : 'EMIs are'}`
      : `${capital(numberWord(count))} ${one ? 'EMI is' : 'EMIs are'}`;
  const when = joinDates(debitDates);
  const rest = one
    ? `One bank debit on ${when} matches it.`
    : `${capital(numberWord(count))} bank debits on ${when} match them.`;
  return {
    count,
    message: `${lead} not marked paid. ${rest}`,
    actionLabel: one ? 'Link it' : `Link all ${numberWord(count)}`,
  };
}

/** The Toast after Link all: "Marked 3 EMIs paid". */
export function paidToast(count: number): string {
  return `Marked ${formatCount(count, ['EMI', 'EMIs'])} paid`;
}
