// The card_utilisation widget's rows: every open credit card (or the one picked)
// with what is owed right now, its limit and the server's live utilisation,
// most utilised first, plus an overall row across cards when there are several.

import { type Account, type CreditCard, getAccountStatus } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { UTILISATION_WATCH_PCT } from '@/lib/utilisation';

export interface UtilisationRow {
  id: string;
  name: string;
  /** Amount owed now (never negative: a card in credit owes nothing). */
  owed: number;
  /** The limit utilisation is measured against; null when the card has none. */
  limit: number | null;
  /** Live owed ÷ limit in percent (server value); null without a limit. */
  pct: number | null;
  /** At or above the 30% line banks and bureaus watch. */
  flagged: boolean;
}

export interface UtilisationModel {
  rows: UtilisationRow[];
  /** Σ owed ÷ Σ effective limits over the cards that have one; only with more than one card. */
  overall: { owed: number; limit: number; pct: number | null } | null;
}

/** Owed on a card from its signed balance (negative = owed). */
export function cardOwed(balance: number | null | undefined): number {
  const b = balance ?? 0;
  return b < 0 ? -b : 0;
}

/** The limit the server measured the percent against (credit limit, else the latest statement's); null without one. */
function limitOf(card: CreditCard): number | null {
  const limit = card.effectiveCreditLimit;
  return limit != null && limit > 0 ? limit : null;
}

function toRow(card: CreditCard): UtilisationRow {
  const owed = cardOwed(card.balance);
  const pct = card.utilizationPct ?? null;
  return {
    id: card.id,
    name: card.name,
    owed,
    limit: limitOf(card),
    pct,
    flagged: pct != null && pct >= UTILISATION_WATCH_PCT,
  };
}

/** Open (not closed as of `today`) credit cards, optionally just `accountId`, as utilisation rows. */
export function buildUtilisationModel(
  accounts: readonly Account[],
  accountId: string | null,
  today: string,
): UtilisationModel {
  const cards = accounts.filter(
    (a): a is CreditCard =>
      a.type === AccountType.CREDIT_CARD &&
      getAccountStatus(a, today) !== 'CLOSED' &&
      (accountId == null || a.id === accountId),
  );
  const rows = cards
    .map(toRow)
    // Most utilised first; cards without a limit (no percent) last, then by name.
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || a.name.localeCompare(b.name));

  if (rows.length < 2) return { rows, overall: null };
  const limited = rows.filter((r) => r.limit != null);
  const owed = limited.reduce((s, r) => s + r.owed, 0);
  const limit = limited.reduce((s, r) => s + (r.limit ?? 0), 0);
  const pct = limit > 0 ? Math.round((owed / limit) * 1000) / 10 : null;
  return { rows, overall: { owed, limit, pct } };
}
