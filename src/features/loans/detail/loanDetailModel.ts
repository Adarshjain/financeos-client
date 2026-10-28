import { daysBetween } from '@/features/loans/loanFormat';
import { formatCount, formatDate, formatMoney, formatPercent } from '@/lib/format';
import type { InstallmentDto, LoanEventResponse, LoanResponse } from '@/lib/loan.types';

/** Rates read without trailing zeros past the second decimal: 8.25, 9, 8.5. */
export function ratePct(pct: number): string {
  return formatPercent(pct, { decimals: 2 });
}

// ---- Header ---------------------------------------------------------------------------------

export type HeaderTone = 'success' | 'neutral' | 'danger';

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
  status: { label: string; tone: HeaderTone };
  /** "Floating 8.25%" */
  rate: string;
  /** "State Bank of India · #SBIHL00482913 · started 1 Aug 25 · ends Jan 45 · paid from HDFC Bank Savings" */
  meta: string;
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
  const amount = formatMoney(inst.emi);
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

export function loanHeader(
  loan: LoanResponse,
  schedule: InstallmentDto[],
  paymentAccountName: string | null,
  today: string,
): LoanHeaderModel {
  const status: LoanHeaderModel['status'] =
    loan.status === 'active'
      ? { label: 'Active', tone: 'success' }
      : loan.status === 'closed'
        ? { label: 'Closed', tone: 'neutral' }
        : { label: 'Foreclosed', tone: 'danger' };
  const meta = [
    loan.lender?.trim() || null,
    loan.loanAccountNumber ? `#${loan.loanAccountNumber}` : null,
    loan.startDate ? `started ${formatDate(loan.startDate, 'list')}` : null,
    loan.projectedEndDate ? `ends ${formatDate(loan.projectedEndDate, 'month')}` : null,
    paymentAccountName ? `paid from ${paymentAccountName}` : null,
  ].filter((part): part is string => Boolean(part));
  return {
    status,
    rate: `${loan.rateType === 'floating' ? 'Floating' : 'Fixed'} ${ratePct(loan.currentAnnualRatePct)}`,
    meta: meta.join(' · '),
    next: nextEmi(loan, schedule, today),
  };
}

// ---- Tiles ----------------------------------------------------------------------------------

export interface DetailTile {
  label: string;
  value: string;
  /** Absent when there is nothing to add. */
  context?: string;
}

export interface TimelineModel {
  /** Share of the borrowed principal repaid, 0 to 100. */
  pct: number;
  start: string;
  today: string;
  end: string;
}

export interface LoanTilesModel {
  tiles: DetailTile[];
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

export function loanTiles(loan: LoanResponse, events: LoanEventResponse[]): LoanTilesModel {
  const repaid = repaidPct(loan);
  const change = emiChange(loan, events);
  const saved = monthsSaved(loan);
  const apr = loan.effectiveAprPct;
  return {
    tiles: [
      {
        label: 'Outstanding',
        value: formatMoney(loan.outstandingPrincipal),
        context:
          loan.principal > 0
            ? `of ${formatMoney(loan.principal)} · ${formatPercent(repaid)} repaid`
            : undefined,
      },
      {
        label: 'Current EMI',
        value: formatMoney(loan.currentEmi),
        context: change
          ? `was ${formatMoney(change.was, { decimals: 'auto' })} before the ${change.cause === 'change' ? 'change' : change.cause}`
          : undefined,
      },
      {
        label: 'Interest paid',
        value: formatMoney(loan.totalInterestPaid),
        context: apr != null ? `effective APR ${ratePct(apr)}` : undefined,
      },
      {
        label: 'Timeline',
        value: `${loan.settledInstallments} / ${loan.totalInstallments}`,
        context: saved > 0 ? `${formatCount(saved, ['month', 'months'])} saved by prepayment` : undefined,
      },
    ],
    timeline: {
      pct: repaid,
      start: loan.startDate ? formatDate(loan.startDate, 'month') : '',
      today: `Today · EMI ${loan.settledInstallments} settled`,
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
