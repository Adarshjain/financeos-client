import type { EpfReviewMatch } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';

/** One amount, with paise when there are any. */
export const reviewMoney = (value: number): string => formatMoney(value, { decimals: 'auto' });

/** Why the app didn't link this credit to the withdrawal by itself. */
export function whyLine(why: string): string | null {
  if (why === 'MULTIPLE_CREDITS') return 'More than one bank credit fits this withdrawal.';
  if (why === 'SHARED_CREDIT') return 'This credit also fits another withdrawal.';
  if (why === 'NEEDS_CONFIRMATION') return 'We always ask before linking EPF money.';
  return null;
}

const KINDS = { PARTIAL: 'Partial withdrawal', FINAL_SETTLEMENT: 'Final settlement', PENSION: 'Pension withdrawal' } as const;

/** "Partial withdrawal", or the entry's own words when its kind is unknown. */
export function kindLabel(entry: EpfReviewMatch['entry']): string {
  if (entry.kind) return KINDS[entry.kind];
  return entry.description?.trim() || 'EPF withdrawal';
}

/** "Amounts match" or "Differs by ₹500". */
export function differenceLine(difference: number): string {
  const abs = Math.abs(difference);
  return abs < 0.005 ? 'Amounts match' : `Differs by ${reviewMoney(abs)}`;
}

/** "3 days apart" */
export function daysApartLine(daysApart: number): string {
  const n = Math.abs(daysApart);
  if (n === 0) return 'Same day';
  return `${n} ${n === 1 ? 'day' : 'days'} apart`;
}

/** The EPF side of the pair, ready to draw. TDS is left out when the withdrawal has none. */
export function entryFacts(entry: EpfReviewMatch['entry']): { creditedOn: string; kind: string; employer: string; gross: string; tds: string | null; received: string } {
  return {
    creditedOn: formatDate(entry.creditedOn, 'input'),
    kind: kindLabel(entry),
    employer: entry.employerName,
    gross: reviewMoney(entry.gross),
    tds: entry.tdsAmount ? reviewMoney(entry.tdsAmount) : null,
    received: reviewMoney(entry.received),
  };
}

/** The bank side of the pair. */
export function creditFacts(credit: EpfReviewMatch['credit']): { date: string; amount: string; description: string; account: string } {
  return { date: formatDate(credit.date, 'input'), amount: reviewMoney(credit.amount), description: credit.description?.trim() || 'No description', account: credit.accountName };
}
