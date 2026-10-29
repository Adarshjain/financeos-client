import { formatTime } from '@/lib/format';
import type { InstrumentType } from '@/lib/types';

import { isLivePrice } from './marketHoursModel';

/** Tone of a signed figure: green up, red down, plain at zero. */
export function moveTone(value: number | null | undefined): 'positive' | 'danger' | undefined {
  if (value == null || Math.round(value * 100) === 0) return undefined;
  return value > 0 ? 'positive' : 'danger';
}

/** "FY 26-27" from the FY's starting year (2026). */
export { fyLabel } from '@/features/loans/detail/financialYearModel';

/** "Stock", "Fund", "ETF": an instrument type in a word. */
export const TYPE_WORDS: Record<InstrumentType, string> = { stock: 'Stock', mutual_fund: 'Fund', etf: 'ETF' };

/** An instrument picked in a form. */
export interface InstrumentRef {
  id: string;
  name: string;
  symbol?: string | null;
}

/** "INFY · Infosys", or the name alone when there is no symbol (funds). */
export function instrumentLabel(i: { name: string; symbol?: string | null }): string {
  return i.symbol && i.symbol !== i.name ? `${i.symbol} · ${i.name}` : i.name;
}

/** "share(s)" or "unit(s)" for a quantity of an instrument type. */
export function unitWord(type: InstrumentType, qty: number): string {
  if (type === 'mutual_fund') return qty === 1 ? 'unit' : 'units';
  return qty === 1 ? 'share' : 'shares';
}

/** "Live · 11:45 am" while the market is open and the price is from today, else "Closed · 13 Oct, 3:30 pm"; '' when the price has no time. */
export function priceTimeLabel(day: string, at: string | null | undefined, now: Date): string {
  const time = formatTime(at);
  if (!time) return '';
  return isLivePrice(at, now) ? `Live · ${time}` : `Closed · ${day ? `${day}, ${time}` : ''}`;
}
