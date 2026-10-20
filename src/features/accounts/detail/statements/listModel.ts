import { formatDayMonth, formatDayMonthYear, formatRupees } from '@/features/accounts/list/accountsList';
import { billStatusLabel } from '@/features/bills/bills.helpers';
import type { CardBillResponse } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';
import type { StatementSummary, StatementVerdict } from '@/lib/statement.types';

import type { BillBadgeTone } from '../billsHistoryModel';

export type StatusWordTone = 'neutral' | 'info' | 'warning' | 'success';

/** The date a statement files under: its period end, else the day it was added in the app zone (as the server files it). */
export function statementDate(s: { periodEnd?: string | null; createdAt: string }): string {
  if (s.periodEnd) return s.periodEnd;
  const at = new Date(s.createdAt);
  return Number.isNaN(at.getTime()) ? s.createdAt.slice(0, 10) : todayInAppZone(at);
}

/** The financial year (April to March) of a calendar date as "26-27"; null when it is not a date. */
export function fyOf(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const start = Number(m[2]) >= 4 ? year : year - 1;
  const two = (n: number) => String(n % 100).padStart(2, '0');
  return `${two(start)}-${two(start + 1)}`;
}

/** First and last day of a financial year given as "26-27": 2026-04-01 and 2027-03-31. */
export function fyBounds(fy: string): { from: string; to: string } {
  const start = 2000 + Number(fy.slice(0, 2));
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
}

export function fyLabel(fy: string): string {
  return `FY ${fy}`;
}

/** True for "26-27": two consecutive years. */
export function isFy(value: string | null | undefined): value is string {
  const m = /^(\d{2})-(\d{2})$/.exec(value ?? '');
  return m != null && (Number(m[1]) + 1) % 100 === Number(m[2]);
}

export interface StatementsView {
  fy: string;
  /** Financial years to pick from, newest first: those with statements, plus the shown one. */
  fyOptions: string[];
  /** The shown year's statements, newest first. */
  inFy: StatementSummary[];
  /** The statement whose detail shows; null when the year has none. */
  selectedId: string | null;
}

/**
 * Which year and statement the page shows. `?fy=` wins when it is a valid year; otherwise the year
 * containing `today`, or the latest year with statements when that one is empty. `?statement=` wins
 * when it is in the shown year; otherwise the newest statement of the year.
 */
export function buildStatementsView(
  statements: readonly StatementSummary[],
  fyParam: string | null | undefined,
  statementParam: string | null | undefined,
  today: string
): StatementsView {
  const withFy = statements.map((s) => ({ s, fy: fyOf(statementDate(s)) }));
  const withStatements = [...new Set(withFy.map((x) => x.fy).filter((f): f is string => f != null))].sort().reverse();
  const todayFy = fyOf(today) ?? withStatements[0] ?? '';
  const fromStatement = withFy.find((x) => x.s.id === statementParam)?.fy ?? null;
  const fy = isFy(fyParam)
    ? fyParam
    : fromStatement
      ? fromStatement
    : withStatements.includes(todayFy)
      ? todayFy
      : (withStatements[0] ?? todayFy);
  const inFy = withFy
    .filter((x) => x.fy === fy)
    .map((x) => x.s)
    .sort((a, b) => statementDate(b).localeCompare(statementDate(a)));
  const fyOptions = withStatements.includes(fy) ? withStatements : [fy, ...withStatements].sort().reverse();
  const selectedId = inFy.find((s) => s.id === statementParam)?.id ?? inFy[0]?.id ?? null;
  return { fy, fyOptions, inFy, selectedId };
}

/** "Auto ingested" and friends: the parse verdict as a plain word. */
export function verdictWord(verdict: StatementVerdict | null | undefined): {
  label: string;
  tone: StatusWordTone;
} | null {
  switch (verdict) {
    case 'AUTO_INGEST':
      return { label: 'Auto ingested', tone: 'success' };
    case 'NEEDS_REVIEW':
      return { label: 'Needs review', tone: 'warning' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'warning' };
    default:
      return null;
  }
}

export function sourceLabel(source: string): string {
  if (source === 'file_upload') return 'Upload';
  if (source === 'gmail') return 'Email';
  return source;
}

/** "₹44,319", or "-₹1,200" for a negative figure. */
export function signedRupees(value: number): string {
  return value < 0 ? `-${formatRupees(-value)}` : formatRupees(value);
}

/** The bill's status badge for a statement row; null when the bill says nothing worth a badge. */
export function billBadge(bill: CardBillResponse | null): { tone: BillBadgeTone; label: string } | null {
  if (!bill) return null;
  switch (bill.status) {
    case 'PAID':
      return { tone: 'success', label: 'Paid' };
    case 'OVERDUE':
      return { tone: 'danger', label: 'Overdue' };
    case 'PARTIAL':
      return { tone: 'warning', label: billStatusLabel('PARTIAL') };
    case 'DUE_UNKNOWN':
      return { tone: 'info', label: billStatusLabel('DUE_UNKNOWN') };
    case 'OPEN': {
      const tone = bill.daysUntilDue != null && bill.daysUntilDue <= 3 ? 'warning' : 'neutral';
      return {
        tone,
        label: bill.paymentDueDate ? `Due ${formatDayMonth(bill.paymentDueDate)}` : billStatusLabel('OPEN'),
      };
    }
    default:
      return null;
  }
}

export interface StatementRowModel {
  id: string;
  title: string;
  caption: string;
  /** The bill was marked paid by hand: the row offers Undo. */
  undo: boolean;
  verdict: { label: string; tone: StatusWordTone } | null;
  badge: { tone: BillBadgeTone; label: string } | null;
  selected: boolean;
}

/** One statement row. Cards add the bill (due, paid, marked by you); banks show the closing balance. */
export function buildStatementRow(
  s: StatementSummary,
  bill: CardBillResponse | null,
  isCard: boolean,
  selectedId: string | null
): StatementRowModel {
  const parts = [sourceLabel(s.source), `${s.transactionCount ?? 0} lines`];
  let undo = false;
  if (!isCard) {
    if (s.closingBalance != null) parts.push(`closing ${signedRupees(s.closingBalance)}`);
  } else if (bill?.status === 'PAID') {
    if (bill.totalAmountDue != null) parts.push(formatRupees(bill.totalAmountDue));
    if (bill.paidMarkedOn) parts.push(`paid ${formatDayMonth(bill.paidMarkedOn)}`);
    if (bill.paidSource === 'MANUAL') {
      parts.push('marked by you');
      undo = true;
    }
  } else {
    if (s.openingBalance != null) parts.push(`opening ${formatRupees(Math.abs(s.openingBalance))}`);
    if (bill?.totalAmountDue != null) parts.push(`due ${formatRupees(bill.totalAmountDue)}`);
  }
  const detailsMissing = isCard && Boolean(s.missingDetails?.length);
  return {
    id: s.id,
    title: formatDayMonthYear(statementDate(s)),
    caption: parts.join(' · '),
    undo,
    verdict: detailsMissing ? { label: 'Details missing', tone: 'warning' } : verdictWord(s.verdict),
    // "Details missing" already says the due date is unknown.
    badge: !isCard || (detailsMissing && bill?.status === 'DUE_UNKNOWN') ? null : billBadge(bill),
    selected: s.id === selectedId,
  };
}
