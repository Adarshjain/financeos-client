import type { BillStatus } from '@/lib/api/types';

/** Bill statuses with nothing left to count down to: the status badge says it all. */
const NO_COUNTDOWN: ReadonlySet<BillStatus> = new Set(['PAID', 'NO_DUE', 'AWAITING_STATEMENT', 'DUE_UNKNOWN']);

/**
 * Days until (negative: since) the payment due date for the card cycle summary, or null when no
 * countdown should show. The summary's own `daysUntilDue` is a bare date difference that knows
 * nothing about payments, so the bill decides: a settled bill shows no countdown and an open one
 * counts with the bill's own days. The summary value is only used once the bill has loaded and
 * there is none; while it loads or after it fails nothing shows, so a paid bill never flashes
 * "overdue".
 */
export function cycleSummaryDaysUntilDue(
  summaryDaysUntilDue: number | null | undefined,
  billQuery: {
    status: 'pending' | 'error' | 'success';
    bill: { status: BillStatus; daysUntilDue?: number | null } | null;
  },
): number | null {
  if (billQuery.status !== 'success') return null;
  const { bill } = billQuery;
  if (!bill) return summaryDaysUntilDue ?? null;
  if (NO_COUNTDOWN.has(bill.status)) return null;
  return bill.daysUntilDue ?? null;
}
