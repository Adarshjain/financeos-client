import type { Schemas } from '@/lib/api/types';

export type DividendRow = Schemas['DividendResponse'];

export const UNRESOLVED_RECEIPTS = ['awaiting', 'overdue', 'unverifiable'] as const;

/** TDS may only be inferred from the gap when it is at most this share of gross. */
export const MAX_TDS_GAP_RATIO = 0.25;

export const expectedNet = (d: DividendRow) => d.amount - (d.tds ?? 0);

/** Merges the three unresolved-receipt pages, newest pay date first. */
export function mergeDividends(pages: DividendRow[][]): DividendRow[] {
  return pages.flat().sort((a, b) => b.payDate.localeCompare(a.payDate));
}

export function filterDividends(rows: DividendRow[], search: string): DividendRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((d) =>
    [d.symbol, d.instrumentName, d.brokerName].some((v) => v?.toLowerCase().includes(q)),
  );
}

const dayDiff = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime());

/**
 * Best candidate for a credit: gross matches (±1), else gross less 10% TDS
 * matches (±1), else the nearest pay date.
 */
export function pickBestDividend(
  rows: DividendRow[],
  txnAmount: number,
  txnDate: string,
): DividendRow | undefined {
  if (rows.length === 0) return undefined;
  return (
    rows.find((d) => Math.abs(d.amount - txnAmount) <= 1) ??
    rows.find((d) => Math.abs(d.amount * 0.9 - txnAmount) <= 1) ??
    rows.reduce((best, d) =>
      dayDiff(d.payDate, txnDate) < dayDiff(best.payDate, txnDate) ? d : best,
    )
  );
}

/** The TDS the credit implies (gross − received), or null when it can't be inferred. */
export function impliedTds(d: DividendRow | undefined, txnAmount: number): number | null {
  if (!d || d.tds) return null;
  const gap = d.amount - txnAmount;
  if (txnAmount >= d.amount || gap > MAX_TDS_GAP_RATIO * d.amount) return null;
  return Math.round(gap * 100) / 100;
}
