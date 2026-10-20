import { serverApi } from '@/lib/api/server';
import { todayInAppZone } from '@/lib/date-range';

import type { BillEntry } from './billsHistoryModel';

/**
 * The card's latest bills, one request (newest statement date first). The request failing throws; a
 * statement without a period end shows its created date.
 */
/** The statement's created day in the app zone, yyyy-mm-dd; empty when unknown. */
function createdDate(createdAt: string | null | undefined): string {
  if (!createdAt) return '';
  const at = new Date(createdAt);
  return Number.isNaN(at.getTime()) ? '' : todayInAppZone(at);
}

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
      periodEnd: bill.periodEnd ?? createdDate(bill.statementCreatedAt),
      bill,
    }));
}
