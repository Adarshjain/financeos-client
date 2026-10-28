// The wording of the built-ins' subtitles, shared by the Dinero frame and the Legacy one. Pure: the
// lookups that need the account list (a picked card's name, an account's type) are done by the callers.

import type { Account } from '@/lib/account.types';
import { formatCount } from '@/lib/format';

/** A param's value when it is a non-empty string. */
export function stringParam(params: Record<string, unknown>, key: string): string | null {
  const v = params[key];
  return typeof v === 'string' && v ? v : null;
}

export const NET_WORTH_SUBTITLE = 'All accounts';
export const ATTENTION_SUBTITLE = 'Most urgent first';
export const ALL_CARDS_SUBTITLE = 'All cards';

/** Upcoming's "Next 14 days"; null (defer to the server's line) without a numeric `days` param. */
export function upcomingSubtitle(params: Record<string, unknown>): string | null {
  const days = params.days;
  return typeof days === 'number' ? `Next ${formatCount(days, ['day', 'days'])}` : null;
}

/** The spend heatmap's "Last 6 months". */
export function monthsSubtitle(months: number): string {
  return `Last ${formatCount(months, ['month', 'months'])}`;
}

/** A card-scoped widget's subtitle: that card's name ("One card" until the list loads or when it is gone). */
export function cardNameText(accounts: readonly Account[] | undefined, accountId: string): string {
  return accounts?.find((a) => a.id === accountId)?.name ?? 'One card';
}

/** An account tile's subtitle: the account's type as `labelOf` words it; "Account" until the list loads. */
export function accountTypeText(
  accounts: readonly Account[] | undefined,
  accountId: string,
  labelOf: (type: Account['type']) => string | undefined,
): string {
  const type = accounts?.find((a) => a.id === accountId)?.type;
  return (type && labelOf(type)) || 'Account';
}
