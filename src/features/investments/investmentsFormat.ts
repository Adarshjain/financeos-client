import { formatAmount, formatDayMonth, formatRupees } from '@/features/accounts/list/accountsList';
import type { InstrumentType } from '@/lib/types';

import { isLivePrice } from './marketHours';

const MINUS = '−';

/** "₹6,38,208": whole rupees. */
export function rupees(value: number): string {
  return value < 0 ? `${MINUS}${formatRupees(Math.abs(value))}` : formatRupees(value);
}

/** "+₹3,566" / "−₹1,398": whole rupees with the sign always shown (zero is "₹0"). */
export function signedRupees(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return '₹0';
  return `${rounded > 0 ? '+' : MINUS}${formatRupees(Math.abs(rounded))}`;
}

/** "₹1,742.60": a unit price, two decimals. */
export function unitPrice(value: number): string {
  return `₹${formatAmount(value, 2)}`;
}

/** "1,742.60" (no ₹): a table figure with two decimals. */
export function plainPrice(value: number): string {
  return formatAmount(value, 2);
}

/** "+10%" / "−0.3%": one decimal (`decimals` for more), none when it is zero; a zero reads "0%". */
export function signedPct(value: number, decimals = 1): string {
  const text = Number(Math.abs(value).toFixed(decimals));
  if (text === 0) return '0%';
  return `${value > 0 ? '+' : MINUS}${text}%`;
}

/** "31.4%": an unsigned percent (XIRR). */
export function plainPct(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

/** "325.11" / "40": a quantity, up to four decimals, none when whole. */
export function quantity(value: number): string {
  return Number(value.toFixed(4)).toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

/** "13 Jul 23": day, month and the two-digit year. */
export function shortDate(iso: string): string {
  const day = formatDayMonth(iso);
  return day ? `${day} ${iso.slice(2, 4)}` : '';
}

/** "15:30" (24h, IST) from an ISO timestamp with an offset; '' when missing or unparseable. */
export function istTime(at: string | null | undefined): string {
  if (!at) return '';
  const ms = new Date(at).getTime();
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms + 330 * 60_000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** "13 Oct, 15:30" when the price has a time, else just "13 Oct". */
export function dayWithTime(day: string, at: string | null | undefined): string {
  const time = istTime(at);
  return day && time ? `${day}, ${time}` : day;
}

/** Tone of a signed figure: green up, red down, plain at zero. */
export function moveTone(value: number | null | undefined): 'positive' | 'danger' | undefined {
  if (value == null || Math.round(value * 100) === 0) return undefined;
  return value > 0 ? 'positive' : 'danger';
}

/** "FY 26-27" from the FY's starting year (2026). */
export { fyLabel } from '@/features/loans/detail/financialYear';

/** "69,704": whole rupees without the sign. */
export function plainRupees(value: number): string {
  return formatAmount(Math.round(value), 0);
}

/** "+6,504" / "\u22121,398": a signed move without the ₹ (zero is "0"). */
export function plainSignedRupees(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : MINUS}${formatAmount(Math.abs(rounded), 0)}`;
}

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

/** "Live · 11:45" while the market is open and the price is from today, else "Close · 13 Oct, 15:30"; '' when the price has no time. */
export function priceTimeLabel(day: string, at: string | null | undefined, now: Date): string {
  if (!istTime(at)) return '';
  return isLivePrice(at, now) ? `Live · ${istTime(at)}` : `Close · ${dayWithTime(day, at)}`;
}
