import { AccountType } from '@/lib/types';

import type { Account, CreditCard, CreditLimitPool } from './account.types';

/** Every shared limit the accounts draw on, once each, in first-seen order. */
export function distinctLimitPools(accounts: readonly Account[]): CreditLimitPool[] {
  const seen = new Map<string, CreditLimitPool>();
  for (const account of accounts) {
    if (account.type !== AccountType.CREDIT_CARD || !account.limitPool) continue;
    if (!seen.has(account.limitPool.id)) seen.set(account.limitPool.id, account.limitPool);
  }
  return [...seen.values()];
}

/**
 * The credit available across cards: each shared limit counted once, plus every unpooled card's
 * own limit (else the latest statement's, as `effectiveCreditLimit` reports it).
 */
export function sumCreditLimits(cards: readonly CreditCard[]): number {
  const pools = new Set<string>();
  let total = 0;
  for (const card of cards) {
    if (card.limitPool) {
      if (pools.has(card.limitPool.id)) continue;
      pools.add(card.limitPool.id);
      total += card.limitPool.creditLimit;
    } else {
      total += card.effectiveCreditLimit ?? (card.creditLimit || 0);
    }
  }
  return total;
}
