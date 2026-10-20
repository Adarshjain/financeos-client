import { formatAmount } from '@/features/accounts/list/accountsList';
import type { LendingDirection } from '@/lib/lending.types';
import { type LendingEntryType } from '@/lib/lendingEntry';

/** What the Settle up sheet records: a repayment against the balance, or a new principal entry. */
export type SettleSegment = 'settle' | 'more';

/** "₹12,000", with paise only when the figure has them. */
export function rupeesExact(value: number): string {
  return `₹${formatAmount(value, Number.isInteger(value) ? 0 : 2)}`;
}

/** "Rahul" from "Rahul Sharma". */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * Which ledger entry a segment records. `direction` is the lending's direction as the obligations
 * list reports it: lent = they owe you, borrowed = you owe them.
 */
export function settleEntryType(direction: LendingDirection, segment: SettleSegment): LendingEntryType {
  if (direction === 'lent') return segment === 'settle' ? 'repaid_to_me' : 'lent';
  return segment === 'settle' ? 'repaid_by_me' : 'borrowed';
}

export function settleSegmentOptions(direction: LendingDirection) {
  return direction === 'lent'
    ? [
        { value: 'settle', label: 'Received' },
        { value: 'more', label: 'Lent more' },
      ]
    : [
        { value: 'settle', label: 'Paid' },
        { value: 'more', label: 'Borrowed more' },
      ];
}

/** The signed balance the ledger keeps: positive when they owe you. */
export function netPositionOf(direction: LendingDirection, balance: number): number {
  return direction === 'lent' ? balance : -balance;
}

/** "Balance ₹12,000 in your favour" or "Balance ₹12,000 in Priya's favour". */
export function settleBalanceLine(direction: LendingDirection, balance: number, firstName: string): string {
  return `Balance ${rupeesExact(balance)} in ${direction === 'lent' ? 'your' : `${firstName}'s`} favour`;
}

/** Half the balance, to the paisa. */
export function halfOf(balance: number): number {
  return Math.round((balance / 2) * 100) / 100;
}
