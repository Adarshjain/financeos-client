import type { QueryClient } from '@tanstack/react-query';

import { keys } from './keys';

/**
 * Invalidate everything a lending-ledger mutation can change.
 *
 * The "Total Lent Out / Total Borrowed / Net Position" cards on the Lendings
 * Ledger page are served by `GET /api/v1/loans/summary` (a combined loans +
 * lendings payload) and cached under `keys.loans.summary()`, which is NOT
 * under the `keys.lendings.all` prefix. Invalidating only `keys.lendings.all`
 * refreshes the counterparties list but leaves those cards stale until a
 * reload. Every lending mutation (create/update/delete entries, counterparty
 * edits/deletes, transaction link/unlink) must go through this helper.
 *
 * Scoped to the summary rather than `keys.loans.all` so loan lists/details
 * are not refetched for a change that cannot affect them.
 */
export function invalidateLendingQueries(qc: QueryClient): Promise<void> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.lendings.all }),
    qc.invalidateQueries({ queryKey: keys.loans.summary() }),
    // Lending returns appear on the Upcoming page and widget.
    qc.invalidateQueries({ queryKey: keys.obligations.all }),
  ]).then(() => undefined);
}

// --- Dashboard widgets (cards & spending group) ---
/**
 * Invalidate what a change to money movement (a transaction added, edited, deleted,
 * merged, linked/unlinked or imported; an account created, edited, closed or deleted)
 * can move beyond the transaction lists: account balances and their 30-day series
 * (`keys.accounts.all`), the emergency fund (`keys.insights.all`) and every dashboard
 * widget's data (spending calendar, net worth and other template built-ins).
 */
export function invalidateMoneyQueries(qc: QueryClient): Promise<void> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.accounts.all }),
    qc.invalidateQueries({ queryKey: keys.insights.all }),
    qc.invalidateQueries({ queryKey: [...keys.dashboards.all, 'widget'] }),
  ]).then(() => undefined);
}

/**
 * Invalidate what a reward rule / cap / milestone / card-config change can move:
 * the Rewards page (`keys.rewards.all`) and the dashboard widgets built on reward
 * data (milestone progress, cap headroom, rewards earned).
 */
export function invalidateRewardQueries(qc: QueryClient): Promise<void> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.rewards.all }),
    qc.invalidateQueries({ queryKey: [...keys.dashboards.all, 'widget'] }),
  ]).then(() => undefined);
}

// --- Dashboard widgets (investments group) ---
/**
 * Invalidate what an investment change (a trade added, edited, deleted or
 * imported; a price refreshed or edited; an instrument created, edited or its
 * asset class overridden; a corporate action; a dividend or F&O trade) can
 * move: every investments query (`keys.investments.all`: positions, summary,
 * tax harvest…) and every dashboard widget's data — template built-ins such as
 * allocation read positions through the widget data endpoint, cached under
 * `keys.dashboards.all, 'widget'`, which the investments prefix does not cover.
 */
export function invalidateInvestmentQueries(qc: QueryClient): Promise<void> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.investments.all }),
    qc.invalidateQueries({ queryKey: [...keys.dashboards.all, 'widget'] }),
  ]).then(() => undefined);
}
