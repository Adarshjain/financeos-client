// The ad-hoc KPI a heatmap day opens.

import { adhocKpi } from '@/features/dashboards/builtins/builtinModel';
import { buildFilter } from '@/lib/reports.helpers';
import type { RunReportRequest } from '@/lib/reports.types';

/** One day's spend, as the calendar counts it: debits, not excluded, not a transfer leg. */
export function daySpendRequest(date: string): RunReportRequest {
  return adhocKpi('transactions', 'spend', [
    buildFilter('type', 'is', 'DEBIT'),
    buildFilter('isExcluded', 'is', false),
    buildFilter('isTransferLeg', 'is', false),
    buildFilter('date', 'is', date),
  ]);
}
