import { billStatusLabel } from '@/features/bills/bills.helpers';
import type { CardBillResponse } from '@/lib/api/types';
import { formatDate,formatMoney } from '@/lib/format';

export type BillBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** One statement and its bill; `bill` is null when that bill's request failed. */
export interface BillEntry {
  statementId: string;
  periodEnd: string;
  bill: CardBillResponse | null;
}

export interface BillRowModel {
  key: string;
  title: string;
  caption: string | null;
  badge: { tone: BillBadgeTone; label: string } | null;
  amount: string | null;
  /** Paid rows show their amount in the muted tone. */
  muted: boolean;
}

/** "on time" or "late" for a paid bill; null when either date is unknown. */
export function paidTiming(
  paidOn: string | null | undefined,
  dueOn: string | null | undefined
): string | null {
  if (!paidOn || !dueOn) return null;
  return paidOn <= dueOn ? 'on time' : 'late';
}

function due(bill: CardBillResponse): string | null {
  return bill.paymentDueDate ? `Due ${formatDate(bill.paymentDueDate, 'list')}` : null;
}

/** One statement row: "{d MMM} statement" with the bill's caption, status badge and amount. */
export function buildBillRow(entry: BillEntry): BillRowModel {
  const { bill } = entry;
  const row: BillRowModel = {
    key: entry.statementId,
    title: `${formatDate(entry.periodEnd, 'list')} statement`,
    caption: null,
    badge: null,
    amount: null,
    muted: false,
  };
  if (!bill) return row;
  row.amount = bill.totalAmountDue != null ? formatMoney(bill.totalAmountDue) : null;
  switch (bill.status) {
    case 'PAID': {
      const timing = paidTiming(bill.paidMarkedOn, bill.paymentDueDate);
      row.caption = bill.paidMarkedOn
        ? `Paid ${formatDate(bill.paidMarkedOn, 'list')}${timing ? ` · ${timing}` : ''}`
        : 'Paid';
      row.badge = { tone: 'success', label: 'Paid' };
      row.muted = true;
      break;
    }
    case 'OVERDUE':
      row.caption = due(bill);
      row.badge = { tone: 'danger', label: 'Overdue' };
      break;
    case 'PARTIAL':
      row.caption = due(bill);
      row.badge = { tone: 'warning', label: billStatusLabel('PARTIAL') };
      break;
    case 'DUE_UNKNOWN':
      row.badge = { tone: 'info', label: billStatusLabel('DUE_UNKNOWN') };
      break;
    case 'OPEN':
      row.caption = due(bill);
      if (bill.daysUntilDue != null && bill.daysUntilDue >= 0) {
        // The live rule (billStatusTone): amber only within 3 days.
        row.badge = {
          tone: bill.daysUntilDue <= 3 ? 'warning' : 'neutral',
          label: `${bill.daysUntilDue} d`,
        };
      }
      break;
    default:
      break;
  }
  return row;
}

/** The latest statements as rows, newest first. */
export function buildBillRows(entries: readonly BillEntry[], limit = 3): BillRowModel[] {
  return [...entries]
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
    .slice(0, limit)
    .map(buildBillRow);
}
