import { serverApi } from '@/lib/api/server';

import type { BillEntry } from './billsHistoryModel';

/**
 * The card's latest bills, one request (newest period end first). The request failing throws; a
 * statement without a period end shows with an empty date.
 */
export async function loadBillsHistory(
  accountId: string,
  limit = 3
): Promise<BillEntry[]> {
  const { data, error } = await serverApi.GET('/api/v1/bills/history', {
    params: { query: { accountId, limit } },
  });
  if (error || data == null)
    throw new Error('Could not load the bills history');
  return data
    .filter((bill) => bill.statementId)
    .map((bill) => ({
      statementId: bill.statementId as string,
      periodEnd: bill.periodEnd ?? '',
      bill,
    }));
}
