import { daysBetween } from '@/features/loans/loanFormatModel';
import { formatCount, formatDate, formatMoney, formatPercent } from '@/lib/format';
import type { InstallmentDto, LoanEventResponse, LoanResponse } from '@/lib/loan.types';

/** Rates read without trailing zeros past the second decimal: 8.25, 9, 8.5. */
export function ratePct(pct: number): string {
  return formatPercent(pct, { decimals: 2 });
}

// ---- Header ---------------------------------------------------------------------------------

export interface NextEmiModel {
  /** "EMI #14 overdue" */
  eyebrow: string;
  /** "₹36,603" */
  amount: string;
  overdue: boolean;
  /** "was due 5 Oct · 8 days ago" */
  context: string;
}

export interface LoanHeaderModel {
  /** "Closed" / "Foreclosed" when the loan is not active, else the lender; null when there is nothing to say. */
  info: string | null;
  next: NextEmiModel | null;
}

/** The first EMI still to pay: an overdue one comes first because the schedule runs in order. */
export function firstUnpaid(schedule: InstallmentDto[]): InstallmentDto | null {
  return [...schedule].sort((a, b) => a.seq - b.seq).find((i) => i.status !== 'settled') ?? null;
}

export function nextEmi(loan: LoanResponse, schedule: InstallmentDto[], today: string): NextEmiModel | null {
  if (loan.status !== 'active') return null;
  const inst = firstUnpaid(schedule);
  if (!inst) return null;
  const amount = formatMoney(inst.emi, { decimals: 'exact' });
  const days = daysBetween(inst.dueDate, today);
  if (inst.status === 'overdue') {
    const ago = Math.max(days ?? 1, 1);
    return {
      eyebrow: `EMI #${inst.seq} overdue`,
      amount,
      overdue: true,
      context: `was due ${formatDate(inst.dueDate, 'list')} · ${formatCount(ago, ['day', 'days'])} ago`,
    };
  }
  const until = Math.max(-(days ?? 0), 0);
  return {
    eyebrow: `EMI #${inst.seq} due`,
    amount,
    overdue: false,
    context:
      until === 0
        ? `due today · ${formatDate(inst.dueDate, 'list')}`
        : `due ${formatDate(inst.dueDate, 'list')} · in ${formatCount(until, ['day', 'days'])}`,
  };
}

export function loanHeader(loan: LoanResponse, schedule: InstallmentDto[], today: string): LoanHeaderModel {
  const info =
    loan.status === 'closed' ? 'Closed' : loan.status === 'foreclosed' ? 'Foreclosed' : loan.lender?.trim() || null;
  return { info, next: nextEmi(loan, schedule, today) };
}

// ---- Tiles ----------------------------------------------------------------------------------

export interface TimelineModel {
  /** Share of the borrowed principal repaid, 0 to 100. */
  pct: number;
  start: string;
  today: string;
  end: string;
}

export interface LoanHeroModel {
  /** Outstanding principal, to the paisa. */
  outstanding: string;
  /** The EMI to pay next ("EMI #14 overdue · ₹36,603 · was due 5 Oct · 8 days ago"); absent when none is due. */
  next: { text: string; overdue: boolean } | null;
  figures: { label: string; value: string; caption?: string }[];
  timeline: TimelineModel;
}

/** Share of the borrowed principal already repaid, 0 to 100. */
export function repaidPct(loan: LoanResponse): number {
  if (loan.principal <= 0) return 0;
  return Math.min(100, Math.max(0, ((loan.principal - loan.outstandingPrincipal) / loan.principal) * 100));
}

/** Months the schedule got shorter than the tenure the loan started with. */
export function monthsSaved(loan: LoanResponse): number {
  return Math.max(0, loan.tenureMonths - loan.totalInstallments);
}

/**
 * Why the EMI is not the one the loan started with: the latest event that can move it, as words after
 * "before the". Null when the EMI is unchanged.
 */
export function emiChange(loan: LoanResponse, events: LoanEventResponse[]): { was: number; cause: string } | null {
  if (Math.abs(loan.currentEmi - loan.emiAmount) < 1) return null;
  const ascending = [...events].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  let rate = loan.annualRatePct;
  let cause = 'change';
  for (const event of ascending) {
    if (event.eventType === 'rate_change' && event.newAnnualRatePct != null) {
      cause = event.newAnnualRatePct < rate ? 'rate cut' : event.newAnnualRatePct > rate ? 'rate rise' : 'rate change';
      rate = event.newAnnualRatePct;
    } else if (event.eventType === 'prepayment' && event.adjustmentMode === 'reduce_emi') {
      cause = 'prepayment';
    }
  }
  return { was: loan.emiAmount, cause };
}

export function loanHero(loan: LoanResponse, events: LoanEventResponse[], next: NextEmiModel | null): LoanHeroModel {
  const repaid = repaidPct(loan);
  const change = emiChange(loan, events);
  const saved = monthsSaved(loan);
  const left = Math.max(0, loan.totalInstallments - loan.settledInstallments);
  return {
    outstanding: formatMoney(loan.outstandingPrincipal, { decimals: 'exact' }),
    next: next ? { text: [next.eyebrow, next.amount, next.context].join(' · '), overdue: next.overdue } : null,
    figures: [
      {
        label: 'EMI',
        value: formatMoney(loan.currentEmi, { decimals: 'exact' }),
        caption: change
          ? `was ${formatMoney(change.was, { decimals: 'exact' })} before the ${change.cause === 'change' ? 'change' : change.cause}`
          : undefined,
      },
      { label: 'Rate', value: `${ratePct(loan.currentAnnualRatePct)} ${loan.rateType}` },
      {
        label: 'Months left',
        value: String(left),
        caption: saved > 0 ? `${formatCount(saved, ['month', 'months'])} saved by prepayment` : undefined,
      },
    ],
    timeline: {
      pct: repaid,
      start: loan.startDate ? formatDate(loan.startDate, 'month') : '',
      today: `Today · ${formatPercent(repaid)} of ${formatMoney(loan.principal)} repaid`,
      end: loan.projectedEndDate ? formatDate(loan.projectedEndDate, 'month') : '—',
    },
  };
}

// ---- Matching -------------------------------------------------------------------------------

/** "13 of 13 paid EMIs": the paid EMIs that point at a bank transaction. */
export function linkedLine(schedule: InstallmentDto[]): string {
  const paid = schedule.filter((i) => i.status === 'settled');
  const linked = paid.filter((i) => Boolean(i.payment?.transactionId));
  return `${linked.length} of ${paid.length} paid EMIs`;
}

/** Core terms lock once the loan has an event or a settled payment (Legacy's rule; the server enforces it too). */
export function termsLocked(events: LoanEventResponse[], schedule: InstallmentDto[]): boolean {
  return events.length > 0 || schedule.some((i) => i.status === 'settled');
}
