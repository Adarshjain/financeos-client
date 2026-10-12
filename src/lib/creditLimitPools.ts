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

/** What a set of cards owes against the credit they have, measured the way each card's utilisation is. */
export interface CreditUsage {
  /** Each shared limit once, plus every unpooled card's limit (see {@link sumCreditLimits}). */
  limit: number;
  /** Each shared limit's owed once (closed members included), plus every unpooled card's owed. */
  owed: number;
  /** Owed on cards with a limit ÷ that limit × 100; null when there is no limit. */
  utilizationPct: number | null;
}

/**
 * Limit, owed and utilisation across cards. A shared limit counts once with what its pool owes; an
 * unpooled card counts its own limit (else the latest statement's, as `effectiveCreditLimit`
 * reports it) and owes the negative part of its balance. A card with no limit adds to owed but not
 * to the utilisation, which would otherwise divide its debt by nothing.
 */
export function sumCreditUsage(cards: readonly CreditCard[]): CreditUsage {
  const pools = new Set<string>();
  let limit = 0;
  let owed = 0;
  let owedAgainstLimit = 0;
  for (const card of cards) {
    if (card.limitPool) {
      if (pools.has(card.limitPool.id)) continue;
      pools.add(card.limitPool.id);
      limit += card.limitPool.creditLimit;
      owed += card.limitPool.owed;
      owedAgainstLimit += card.limitPool.owed;
    } else {
      const cardLimit = card.effectiveCreditLimit ?? (card.creditLimit || 0);
      const cardOwed = Math.max(0, -(card.balance ?? 0));
      limit += cardLimit;
      owed += cardOwed;
      if (cardLimit > 0) owedAgainstLimit += cardOwed;
    }
  }
  return { limit, owed, utilizationPct: limit > 0 ? (owedAgainstLimit / limit) * 100 : null };
}

/**
 * The credit available across cards: each shared limit counted once, plus every unpooled card's
 * own limit (else the latest statement's, as `effectiveCreditLimit` reports it).
 */
export function sumCreditLimits(cards: readonly CreditCard[]): number {
  return sumCreditUsage(cards).limit;
}
