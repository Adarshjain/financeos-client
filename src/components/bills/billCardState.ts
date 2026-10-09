import type { BillStatus, CardBillResponse } from '@/lib/api/types';

/**
 * Where a card sits in its billing cycle, as the Bills due widget shows it:
 * - `awaiting`: no bill to act on (no live statement, paid, or nothing due); shows unbilled spend.
 * - `arrived`: a statement is out and something is left to pay (or its details are missing).
 * - `overdue`: arrived and past the due date; escalated and sorted first.
 */
export type BillCardPhase = 'overdue' | 'arrived' | 'awaiting';

export interface BillCardState {
  bill: CardBillResponse;
  phase: BillCardPhase;
  /** What is left to pay on the statement; null in the awaiting phase or when unknown. */
  toPay: number | null;
  /** Card spend (debits) since the last statement closed; credits never reduce it. Null when unknown. */
  unbilled: number | null;
  /** Awaiting with no unbilled spend: collapses into the "Nothing pending" group. */
  nothingPending: boolean;
  /** Awaiting and the expected statement date has already passed. */
  statementLate: boolean;
}

export interface BillsWidgetModel {
  /** Overdue, then arrived by due date, then awaiting by expected statement date. */
  rows: BillCardState[];
  /** Awaiting cards with nothing unbilled, shown as one collapsible row at the bottom. */
  nothingPending: BillCardState[];
  /** Sum of `toPay` across arrived and overdue cards. */
  toPayTotal: number;
  /** Sum of positive unbilled spend across every card. */
  unbilledTotal: number;
}

const ARRIVED: ReadonlySet<BillStatus> = new Set<BillStatus>(['OPEN', 'PARTIAL', 'DUE_UNKNOWN']);

export function billCardPhase(status: BillStatus): BillCardPhase {
  if (status === 'OVERDUE') return 'overdue';
  if (ARRIVED.has(status)) return 'arrived';
  return 'awaiting';
}

/** Derives one card's widget state. `today` is the business date (YYYY-MM-DD, IST). */
export function deriveBillCardState(bill: CardBillResponse, today: string): BillCardState {
  const phase = billCardPhase(bill.status);
  const unbilled = bill.unbilledAmount ?? null;
  const expected = bill.nextStatementExpectedOn ?? null;
  return {
    bill,
    phase,
    toPay: phase === 'awaiting' ? null : (bill.remainingAmount ?? bill.totalAmountDue ?? null),
    unbilled,
    nothingPending: phase === 'awaiting' && (unbilled == null || unbilled <= 0),
    statementLate: phase === 'awaiting' && expected != null && expected < today,
  };
}

const PHASE_ORDER: Record<BillCardPhase, number> = { overdue: 0, arrived: 1, awaiting: 2 };

/** The date a row sorts by inside its phase; undated rows go last. */
function sortDate(s: BillCardState): string {
  const date = s.phase === 'awaiting' ? s.bill.nextStatementExpectedOn : s.bill.paymentDueDate;
  return date ?? '9999-12-31';
}

function compareStates(a: BillCardState, b: BillCardState): number {
  return (
    PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] ||
    sortDate(a).localeCompare(sortDate(b)) ||
    a.bill.accountName.localeCompare(b.bill.accountName)
  );
}

/** Splits the bills into sorted rows, the nothing-pending group and the header totals. */
export function buildBillsWidgetModel(bills: CardBillResponse[], today: string): BillsWidgetModel {
  const states = bills.map((b) => deriveBillCardState(b, today)).sort(compareStates);
  let toPayTotal = 0;
  let unbilledTotal = 0;
  for (const s of states) {
    if (s.phase !== 'awaiting' && s.toPay != null) toPayTotal += s.toPay;
    if (s.unbilled != null && s.unbilled > 0) unbilledTotal += s.unbilled;
  }
  return {
    rows: states.filter((s) => !s.nothingPending),
    nothingPending: states.filter((s) => s.nothingPending),
    toPayTotal,
    unbilledTotal,
  };
}

/** True when the row is the one a link (statement id or card id) points at. */
export function isHighlighted(
  bill: CardBillResponse,
  highlight: { statementId: string | null; accountId: string | null },
): boolean {
  return (
    (highlight.statementId != null && bill.statementId === highlight.statementId) ||
    (highlight.accountId != null && bill.accountId === highlight.accountId)
  );
}
