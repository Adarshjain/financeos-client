import { daysBetween } from '@/features/loans/loanFormat';
import { formatDate, formatMoney } from '@/lib/format';
import type { InstallmentDto, LoanEventResponse, LoanResponse } from '@/lib/loan.types';

import { fyLabel, fyStartYear } from './financialYear';
import { ratePct } from './loanDetailModel';

/** An EMI due within this many days reads "In n d"; further out it is just upcoming. */
export const SOON_DAYS = 30;

export type StatusTone = 'success' | 'danger' | 'neutral';

export interface ScheduleStatus {
  label: string;
  tone: StatusTone;
}

/** Paid, "Overdue 8 d", "In 23 d" (within a month), "Due today", else Upcoming. */
export function scheduleStatus(inst: InstallmentDto, today: string): ScheduleStatus {
  if (inst.status === 'settled') return { label: 'Paid', tone: 'success' };
  const days = daysBetween(today, inst.dueDate);
  if (inst.status === 'overdue') {
    const late = days == null ? 0 : Math.max(-days, 1);
    return { label: late > 0 ? `Overdue ${late} d` : 'Overdue', tone: 'danger' };
  }
  if (days === 0) return { label: 'Due today', tone: 'neutral' };
  if (days != null && days > 0 && days <= SOON_DAYS) return { label: `In ${days} d`, tone: 'neutral' };
  return { label: 'Upcoming', tone: 'neutral' };
}

// ---- Financial years ------------------------------------------------------------------------

export interface FyOption {
  /** The calendar year the financial year starts in, as text (the Select's value). */
  value: string;
  /** "FY 26-27" */
  label: string;
}

/** Every financial year the schedule touches, oldest first. */
export function fyOptions(schedule: InstallmentDto[]): FyOption[] {
  const years = [...new Set(schedule.map((i) => fyStartYear(i.dueDate)))].sort((a, b) => a - b);
  return years.map((y) => ({ value: String(y), label: fyLabel(y) }));
}

/**
 * The financial year the schedule opens on: the one holding `?installment=N` when that EMI exists, else the
 * current one, else (before the loan starts or after it ends) the nearest one the schedule has.
 */
export function initialFy(schedule: InstallmentDto[], today: string, highlightSeq: number | null): string | null {
  const options = fyOptions(schedule);
  if (options.length === 0) return null;
  const target = highlightSeq == null ? undefined : schedule.find((i) => i.seq === highlightSeq);
  if (target) return String(fyStartYear(target.dueDate));
  const current = fyStartYear(today);
  const years = options.map((o) => Number(o.value));
  if (years.includes(current)) return String(current);
  return String(years.reduce((best, y) => (Math.abs(y - current) < Math.abs(best - current) ? y : best)));
}

export interface FySummary {
  emis: number;
  principal: number;
  interest: number;
}

export function fySummary(schedule: InstallmentDto[], fy: string): FySummary {
  const rows = schedule.filter((i) => String(fyStartYear(i.dueDate)) === fy);
  return {
    emis: rows.length,
    principal: rows.reduce((sum, i) => sum + i.principal, 0),
    interest: rows.reduce((sum, i) => sum + i.interest, 0),
  };
}

/** "FY 26-27 · 12 EMIs · principal ₹95,798 · interest ₹3,43,443" */
export function fySummaryLine(schedule: InstallmentDto[], fy: string): string {
  const s = fySummary(schedule, fy);
  return [
    fyLabel(Number(fy)),
    `${s.emis} ${s.emis === 1 ? 'EMI' : 'EMIs'}`,
    `principal ${formatMoney(s.principal)}`,
    `interest ${formatMoney(s.interest)}`,
  ].join(' · ');
}

// ---- Rows -----------------------------------------------------------------------------------

export interface ScheduleRow {
  id: string;
  seq: number;
  /** "5 Apr" */
  due: string;
  opening: string;
  emi: string;
  interest: string;
  principal: string;
  closing: string;
  status: ScheduleStatus;
  settled: boolean;
  overdue: boolean;
  /** The payment that settled it, for Unlink. */
  payment: InstallmentDto['payment'] | null;
  /** "interest 31,511 · principal 7,541" */
  phoneSub: string;
  fy: string;
  /** The prepayment or rate change that happened before this EMI and after the one above it. */
  band: { key: string; label: string } | null;
  installment: InstallmentDto;
}

function adjustmentWords(mode: LoanEventResponse['adjustmentMode']): string {
  return mode === 'reduce_emi' ? 'EMI reduced' : 'tenure reduced';
}

/** The band line of one event: its date, what it was, and what it did to the schedule. */
export function eventBandLabel(
  event: LoanEventResponse,
  priorRate: number,
  emiBefore: number | null,
  emiAfter: number,
): string {
  const date = formatDate(event.effectiveDate, 'list');
  const emiNote =
    emiBefore != null && Math.abs(emiAfter - emiBefore) >= 1
      ? `EMI ${emiAfter < emiBefore ? 'reduced' : 'raised'} to ${formatMoney(emiAfter, { decimals: 'auto' })}`
      : null;
  if (event.eventType === 'rate_change') {
    const rate = event.newAnnualRatePct != null ? `Rate ${ratePct(priorRate)} → ${ratePct(event.newAnnualRatePct)}` : 'Rate change';
    return [date, rate, emiNote].filter(Boolean).join(' · ');
  }
  if (event.eventType === 'foreclosure') {
    return [date, `Foreclosure${event.amount != null ? ` ${formatMoney(event.amount, { decimals: 'auto' })}` : ''}`].join(' · ');
  }
  const prepay = `Prepayment${event.amount != null ? ` ${formatMoney(event.amount, { decimals: 'auto' })}` : ''}`;
  const effect = event.adjustmentMode === 'reduce_emi' ? (emiNote ?? adjustmentWords('reduce_emi')) : adjustmentWords('reduce_tenure');
  return [date, prepay, effect].join(' · ');
}

/**
 * Every EMI of the schedule as a table row. An event lands as a band above the first EMI due on or after
 * its date; events dated after the last EMI have no row to sit above and show in the Events card only.
 */
export function buildScheduleRows(
  loan: LoanResponse,
  schedule: InstallmentDto[],
  events: LoanEventResponse[],
  today: string,
): ScheduleRow[] {
  const ordered = [...schedule].sort((a, b) => a.seq - b.seq);
  const eventsAscending = [...events].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  // The rate before each event: the one the loan started with, then each earlier rate change's rate.
  const priorRate = new Map<string, number>();
  let rate = loan.annualRatePct;
  for (const event of eventsAscending) {
    priorRate.set(event.id, rate);
    if (event.eventType === 'rate_change' && event.newAnnualRatePct != null) rate = event.newAnnualRatePct;
  }

  return ordered.map((inst, i) => {
    const previous = i > 0 ? ordered[i - 1] : null;
    const happened = eventsAscending.filter(
      (e) => e.effectiveDate <= inst.dueDate && (previous == null || e.effectiveDate > previous.dueDate),
    );
    const status = scheduleStatus(inst, today);
    return {
      id: String(inst.seq),
      seq: inst.seq,
      due: formatDate(inst.dueDate, 'list'),
      opening: formatMoney(inst.openingBalance, { symbol: false }),
      emi: formatMoney(inst.emi, { symbol: false }),
      interest: formatMoney(inst.interest, { symbol: false }),
      principal: formatMoney(inst.principal, { symbol: false }),
      closing: formatMoney(inst.closingBalance, { symbol: false }),
      status,
      settled: inst.status === 'settled',
      overdue: inst.status === 'overdue',
      payment: inst.payment ?? null,
      phoneSub: `interest ${formatMoney(inst.interest, { symbol: false })} · principal ${formatMoney(inst.principal, { symbol: false })}`,
      fy: String(fyStartYear(inst.dueDate)),
      band:
        happened.length > 0
          ? {
              key: happened.map((e) => e.id).join('+'),
              label: happened
                .map((e) => eventBandLabel(e, priorRate.get(e.id) ?? loan.annualRatePct, previous?.emi ?? null, inst.emi))
                .join('; '),
            }
          : null,
      installment: inst,
    };
  });
}

// ---- Interest vs principal ------------------------------------------------------------------

export interface FySplit {
  /** "FY 26-27" */
  label: string;
  /** Sum of the EMIs due in the year, compact: "₹4.39L". */
  emiTotal: string;
  emis: number;
  interest: number;
  principal: number;
}

/**
 * One split per financial year: from the year of the first EMI through the year after today's, never past the
 * year of the last EMI. Empty for a loan with no installments.
 */
export function fySplits(schedule: InstallmentDto[], today: string): FySplit[] {
  if (schedule.length === 0) return [];
  const years = schedule.map((i) => fyStartYear(i.dueDate));
  const first = Math.min(...years);
  const last = Math.min(Math.max(...years), fyStartYear(today) + 1);
  const out: FySplit[] = [];
  for (let y = first; y <= last; y += 1) {
    const rows = schedule.filter((i) => fyStartYear(i.dueDate) === y);
    out.push({
      label: fyLabel(y),
      emiTotal: formatMoney(rows.reduce((sum, i) => sum + i.emi, 0), { compact: true }),
      emis: rows.length,
      interest: rows.reduce((sum, i) => sum + i.interest, 0),
      principal: rows.reduce((sum, i) => sum + i.principal, 0),
    });
  }
  return out;
}
