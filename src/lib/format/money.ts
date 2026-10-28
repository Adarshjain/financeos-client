export type MoneyOptions = {
  /** 'whole' rounds to the rupee (default); 'auto' shows paise only when non-zero; 'exact' always 2 decimals. */
  decimals?: 'whole' | 'auto' | 'exact';
  /** 'auto' signs negatives only (default); 'always' also signs positives; 'none' drops the sign. */
  sign?: 'auto' | 'always' | 'none';
  /** Lakh/crore short form; 'k' also shortens thousands (chart axes). */
  compact?: boolean | 'k';
  /** Show the rupee symbol (default true). */
  symbol?: boolean;
};

const MINUS = '−';

const nf = (fd: number, maxFd = fd) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: fd, maximumFractionDigits: maxFd });
const NF0 = nf(0);
const NF2 = nf(2);
const NF_TRIM2 = nf(0, 2);

function round(v: number, fd: number): number {
  const p = 10 ** fd;
  return Math.round(v * p) / p;
}

const COMPACT_UNITS = [
  { at: 1e7, label: 'Cr' },
  { at: 1e5, label: 'L' },
  { at: 1e3, label: 'K' },
] as const;

function compactBody(abs: number, k: boolean): string | null {
  const units = k ? COMPACT_UNITS : COMPACT_UNITS.slice(0, 2);
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    // A value that rounds up to the threshold (99,999.6) already reads in that unit.
    if (Math.round(abs) < u.at) continue;
    let scaled = round(abs / u.at, 2);
    // 99.999L rounds to 100L: promote it to the next unit up instead.
    if (i > 0 && scaled * u.at >= units[i - 1].at) {
      const up = units[i - 1];
      scaled = round(abs / up.at, 2);
      return `${NF_TRIM2.format(scaled)}${up.label}`;
    }
    return `${NF_TRIM2.format(scaled)}${u.label}`;
  }
  return null;
}

/** Rupee amounts, Indian grouping: ₹11,98,842. Empty string for null, undefined, '' or NaN. */
export function formatMoney(value: number | string | null | undefined, opts: MoneyOptions = {}): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return '';
  const { decimals = 'whole', sign = 'auto', compact = false, symbol = true } = opts;
  const abs = Math.abs(num);

  let fd = decimals === 'exact' ? 2 : 0;
  if (decimals === 'auto') fd = Math.round(abs * 100) % 100 !== 0 ? 2 : 0;

  let body: string | null = compact ? compactBody(abs, compact === 'k') : null;
  let zero = false;
  if (body === null) {
    zero = round(abs, fd) === 0;
    body = (fd === 2 ? NF2 : NF0).format(abs);
  }
  const negative = num < 0 && !zero;
  const prefix = sign === 'none' ? '' : negative ? MINUS : sign === 'always' && !zero ? '+' : '';
  return `${prefix}${symbol ? '₹' : ''}${body}`;
}
