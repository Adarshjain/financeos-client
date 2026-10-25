// The emergency fund's wording: month names for the bars, "4.2 months", and why there is no figure yet.

import type { EmergencyFund } from '@/lib/query/hooks/useEmergencyFund';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Apr" (and the year, for labels: "Apr 2026") from YYYY-MM. */
export function monthName(month: string, withYear = false): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTHS[m - 1] ?? month;
  return withYear ? `${name} ${y}` : name;
}

/** "4.2 months" / "1 month". */
export function formatMonthsCovered(months: number): string {
  const text = Number.isInteger(months) ? String(months) : months.toFixed(1);
  return `${text} ${months === 1 ? 'month' : 'months'}`;
}

/** Why there is no months-covered figure yet. */
export function noFigureReason(fund: EmergencyFund): string {
  if (fund.historyMonths === 0) {
    return 'Months covered appear once your bank and cash accounts have a full month of transactions.';
  }
  const span = `${fund.historyMonths} ${fund.historyMonths === 1 ? 'month' : 'months'}`;
  // The figure uses the median month, so a few months with outflow among mostly empty ones still give 0.
  if (fund.months.some((m) => !m.beforeHistory && Number(m.outflow) > 0)) {
    return `Most of the last ${span} had no outflow from your bank and cash accounts, so the usual monthly outflow is ₹0.`;
  }
  return `No outflow from your bank and cash accounts in the last ${span}.`;
}
