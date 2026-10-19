import { serverApi } from '@/lib/api/server';
import { statementsApi } from '@/lib/apiClient';

import type { BillEntry } from './billsHistoryModel';

/**
 * The account's latest statements with each one's bill, fetched in parallel. Each bill degrades
 * on its own (its row keeps the title only); the statements request failing throws.
 */
export async function loadBillsHistory(accountId: string, limit = 3): Promise<BillEntry[]> {
  const statements = await statementsApi.listByAccount(accountId);
  const latest = [...statements]
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
    .slice(0, limit);
  const bills = await Promise.allSettled(
    latest.map(async (s) => {
      const { data } = await serverApi.GET('/api/v1/bills/{statementId}', {
        params: { path: { statementId: s.id } },
      });
      return data ?? null;
    })
  );
  return latest.map((s, i) => {
    const result = bills[i];
    return {
      statementId: s.id,
      periodEnd: s.periodEnd,
      bill: result.status === 'fulfilled' ? result.value : null,
    };
  });
}
