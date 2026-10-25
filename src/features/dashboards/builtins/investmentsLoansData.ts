// Pure data helpers shared by the investments & loans dashboard widgets: a wire number as a number, and the
// ad-hoc KPI requests their drills open. Moved here from the Legacy investmentsLoansKit; Legacy imports them back.

import type { FilterClause, RunReportRequest } from '@/lib/reports.types';

/** A wire number (number or decimal string) as a number; null when absent or not a number. */
export function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Open holdings' current value as a KPI: the portfolio value, or one asset class's share of it. */
export function positionsValueRequest(extra: FilterClause[] = []): RunReportRequest {
  return {
    type: 'KPI',
    datasource: 'positions',
    definition: {
      measure: 'currentValue',
      aggregation: 'sum',
      // Same filter as the allocation template: open holdings only.
      filters: [{ field: 'isOpen', operator: 'is', value: true }, ...extra],
      comparison: { enabled: false },
    },
  };
}

/** Equity-oriented gains booked this financial year for one term ('short' | 'long'). */
export function bookedGainsRequest(term: 'short' | 'long'): RunReportRequest {
  return {
    type: 'KPI',
    datasource: 'realized_lots',
    definition: {
      measure: 'realizedPnl',
      aggregation: 'sum',
      filters: [
        { field: 'sellDate', operator: 'current_fy' },
        { field: 'term', operator: 'is', value: term },
        { field: 'taxClass', operator: 'is', value: 'EQUITY_ORIENTED' },
      ],
    },
  };
}
