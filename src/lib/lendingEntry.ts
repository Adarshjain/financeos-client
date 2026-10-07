import type { LendingDirection, LendingKind } from '@/lib/lending.types';
import { formatMoney } from '@/lib/utils';

/**
 * The four things a ledger entry can be, as the user thinks of them. The
 * server stores this as (direction, kind): direction is the money flow and
 * drives every balance, kind says whether the money created debt or cleared it.
 */
export type LendingEntryType = 'lent' | 'repaid_by_me' | 'borrowed' | 'repaid_to_me';

export const LENDING_ENTRY_TYPES: readonly LendingEntryType[] = [
  'lent',
  'repaid_by_me',
  'borrowed',
  'repaid_to_me',
];

export const ENTRY_TYPE_LABEL: Record<LendingEntryType, string> = {
  lent: 'I lent money',
  repaid_by_me: 'I paid back what I owed',
  borrowed: 'I borrowed money',
  repaid_to_me: 'They paid me back',
};

/** Short form for badges and confirmations. */
export const ENTRY_TYPE_SHORT: Record<LendingEntryType, string> = {
  lent: 'Lent',
  repaid_by_me: 'You repaid',
  borrowed: 'Borrowed',
  repaid_to_me: 'They repaid',
};

export function toEntryType(direction: LendingDirection, kind: LendingKind | undefined): LendingEntryType {
  if (kind === 'settlement') return direction === 'lent' ? 'repaid_by_me' : 'repaid_to_me';
  return direction;
}

export function fromEntryType(type: LendingEntryType): { direction: LendingDirection; kind: LendingKind } {
  switch (type) {
    case 'lent':
      return { direction: 'lent', kind: 'principal' };
    case 'repaid_by_me':
      return { direction: 'lent', kind: 'settlement' };
    case 'borrowed':
      return { direction: 'borrowed', kind: 'principal' };
    case 'repaid_to_me':
      return { direction: 'borrowed', kind: 'settlement' };
  }
}

export function directionOf(type: LendingEntryType): LendingDirection {
  return fromEntryType(type).direction;
}

export function isSettlementType(type: LendingEntryType): boolean {
  return fromEntryType(type).kind === 'settlement';
}

/** The two entry types that move money the given way. */
export function entryTypesForDirection(direction: LendingDirection): LendingEntryType[] {
  return direction === 'lent' ? ['lent', 'repaid_by_me'] : ['borrowed', 'repaid_to_me'];
}

/**
 * Default for a transaction of known direction against a person with a known
 * balance: clearing an existing balance beats recording new debt.
 */
export function suggestedEntryType(direction: LendingDirection, netPosition: number): LendingEntryType {
  if (direction === 'borrowed' && netPosition > 0) return 'repaid_to_me';
  if (direction === 'lent' && netPosition < 0) return 'repaid_by_me';
  return direction;
}

/**
 * Soft warning for a settlement that does not fit the person's balance (nothing
 * owed in that direction, or more than what is owed). Never blocks: partial and
 * over-settlements are legitimate, the ledger just flips sign.
 */
export function settlementWarning(
  type: LendingEntryType,
  amount: number,
  netPosition: number,
  name: string,
): string | null {
  if (!isSettlementType(type) || !(amount > 0)) return null;
  if (type === 'repaid_to_me') {
    if (netPosition <= 0) return `${name} doesn't owe you anything right now.`;
    if (amount > netPosition) return `That's more than the ${formatMoney(netPosition)} ${name} owes you.`;
    return null;
  }
  if (netPosition >= 0) return `You don't owe ${name} anything right now.`;
  if (amount > -netPosition) return `That's more than the ${formatMoney(-netPosition)} you owe ${name}.`;
  return null;
}

/** The single entry that zeroes the balance, or null when already settled. */
export function settleUpEntry(netPosition: number): { entryType: LendingEntryType; amount: number } | null {
  if (netPosition > 0) return { entryType: 'repaid_to_me', amount: netPosition };
  if (netPosition < 0) return { entryType: 'repaid_by_me', amount: -netPosition };
  return null;
}
