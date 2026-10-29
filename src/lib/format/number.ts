import { formatMoney } from './money';

const NF_COUNT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const MINUS = '−';

/** A percentage already in percent units: 34.25 → "34.3%". Empty string for null or NaN. */
export function formatPercent(
  value: number | null | undefined,
  opts: { decimals?: 0 | 1 | 2; sign?: 'auto' | 'always'; fixed?: boolean } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const { decimals = 1, sign = 'auto', fixed = false } = opts;
  const p = 10 ** decimals;
  const rounded = Math.round(Math.abs(value) * p) / p;
  let body = rounded.toFixed(decimals);
  if (!fixed && body.includes('.')) body = body.replace(/\.?0+$/, '');
  if (rounded === 0) return `${body}%`;
  const prefix = value < 0 ? MINUS : sign === 'always' ? '+' : '';
  return `${prefix}${body}%`;
}

/** The word only: pluralize(3, 'entry', 'entries') → "entries". */
export function pluralize(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** A whole count, Indian grouping: 1234567 → "12,34,567". A unit string or [one, many] pair is appended. */
export function formatCount(
  n: number | null | undefined,
  unit?: string | readonly [one: string, many: string],
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  const num = NF_COUNT.format(n) === '-0' ? 0 : n;
  const text = NF_COUNT.format(num);
  if (!unit) return text;
  return `${text} ${typeof unit === 'string' ? unit : pluralize(n, unit[0], unit[1])}`;
}

/** A quantity (units, shares): up to maxDecimals, trailing zeros trimmed. */
export function formatQuantity(value: number | null | undefined, maxDecimals = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const text = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals }).format(value);
  return text === '-0' ? '0' : text;
}

/** A compact count for axis ticks, same rules as compact money without the symbol: 1250 → "1.25K", −3,50,000 → "−3.5L". */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  // Below 1000 keep fractions (axis steps of 0.5); the compact money path would round them away.
  if (Math.abs(value) < 1000) return formatQuantity(value, 2).replace(/^-/, '−');
  return formatMoney(value, { compact: 'k', symbol: false });
}
