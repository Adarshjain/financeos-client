/** The calendar year a financial year (April to March) starts in, from a YYYY-MM-DD date. */
export function fyStartYear(iso: string): number {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return month >= 4 ? year : year - 1;
}

/** "FY 2026-27": the Legacy schedule's group key. */
export function fyGroupKey(iso: string): string {
  const start = fyStartYear(iso);
  return `FY ${start}-${String(start + 1).slice(-2)}`;
}

/** "FY 26-27": the Dinero label of a financial year, from the year it starts in. */
export { fyLabel } from '@/lib/format';
