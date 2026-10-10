// The ad-hoc KPIs the emergency fund drills into: the liquid balance (net
// worth's bank + wallet/cash rows) and one month's outflow (the same filters
// the server sums for that month).

import { buildFilter, dateBetween } from '@/lib/reports.helpers';
import type { RunReportRequest } from '@/lib/reports.types';

import { adhocKpi } from '../cards_spending_kit/kit';

export const LIQUID_KINDS = ['bank_account', 'generic'];
export const EXCLUDED_LINK_TYPES = ['TRANSFER', 'REVERSAL'];

export function liquidBalanceRequest(): RunReportRequest {
  return adhocKpi('net_worth', 'signedValue', [buildFilter('kind', 'in', LIQUID_KINDS)]);
}

/** First and last day of a YYYY-MM month. */
export function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export function monthOutflowRequest(month: string, accountIds: string[]): RunReportRequest {
  const { from, to } = monthBounds(month);
  return adhocKpi('transactions', 'spend', [
    buildFilter('account', 'in', accountIds),
    buildFilter('type', 'is', 'DEBIT'),
    buildFilter('isExcluded', 'is', false),
    buildFilter('linkType', 'not_in', EXCLUDED_LINK_TYPES),
    buildFilter('date', 'between', dateBetween(from, to)),
  ]);
}
