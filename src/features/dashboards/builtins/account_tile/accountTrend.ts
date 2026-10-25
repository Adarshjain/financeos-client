// The account tile's 30-day trend: how many days it covers and the values as the headline reads them
// (moved from the Legacy tile, which imports them back).

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

export const ACCOUNT_TILE_DAYS = 30;

/** The trend as the headline reads it: a card's owed amount goes up as it is spent on. */
export function trendValues(account: Pick<Account, 'type'>, balances: readonly number[]): number[] {
  return account.type === AccountType.CREDIT_CARD ? balances.map((b) => -b) : [...balances];
}
