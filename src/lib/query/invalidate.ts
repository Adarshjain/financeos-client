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
  ]).then(() => undefined);
}
