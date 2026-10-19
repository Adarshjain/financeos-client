import type { BillStatus, CardBillResponse } from '@/lib/api/types';

export type BadgeTone = 'destructive' | 'warning' | 'success' | 'slate' | 'info';

export function billStatusLabel(status: BillStatus): string {
  switch (status) {
    case 'OVERDUE':
      return 'Overdue';
    case 'PAID':
      return 'Paid';
    case 'PARTIAL':
      return 'Partly paid';
    case 'NO_DUE':
      return 'Nothing due';
    case 'DUE_UNKNOWN':
      return 'Due date missing';
    case 'AWAITING_STATEMENT':
      return 'Awaiting statement';
    case 'OPEN':
    default:
      return 'Due';
  }
}

export function billStatusTone(status: BillStatus, daysUntilDue?: number | null): BadgeTone {
  switch (status) {
    case 'OVERDUE':
      return 'destructive';
    case 'PAID':
    case 'NO_DUE':
      return 'success';
    case 'DUE_UNKNOWN':
      return 'info';
    case 'AWAITING_STATEMENT':
      return 'slate';
    case 'PARTIAL':
    case 'OPEN':
    default:
      return daysUntilDue != null && daysUntilDue <= 3 ? 'warning' : 'slate';
  }
}

/** "Due today" / "Due in 3 days" / "Overdue by 2 days" / "Paid 12/10/2026"-style phrase for the row. */
export function billDueText(bill: Pick<CardBillResponse, 'status' | 'daysUntilDue'>): string {
  const days = bill.daysUntilDue;
  switch (bill.status) {
    case 'PAID':
      return 'Paid';
    case 'NO_DUE':
      return 'Nothing to pay this cycle';
    case 'DUE_UNKNOWN':
      return 'Set the due date to start reminders';
    case 'AWAITING_STATEMENT':
      return 'Awaiting statement';
    case 'OVERDUE': {
      const n = days == null ? 1 : Math.max(1, -days);
      return `Overdue by ${n} ${n === 1 ? 'day' : 'days'}`;
    }
    default:
      if (days == null) return 'Due';
      if (days <= 0) return 'Due today';
      if (days === 1) return 'Due tomorrow';
      return `Due in ${days} days`;
  }
}

/** Card label for rows and dialogs: "HDFC Regalia ••4321". */
export function billCardLabel(bill: Pick<CardBillResponse, 'accountName' | 'last4'>): string {
  return bill.last4 ? `${bill.accountName} ••${bill.last4}` : bill.accountName;
}

/**
 * Bills that still need the user to pay or fill something in. Cards awaiting their next
 * statement (and paid / nothing-due ones) are not actionable.
 */
export function countActionable(bills: CardBillResponse[]): number {
  return bills.filter((b) => b.status === 'OVERDUE' || b.status === 'OPEN' || b.status === 'PARTIAL' || b.status === 'DUE_UNKNOWN').length;
}
