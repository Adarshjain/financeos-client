// Shared chart helpers: series colours, value formatting (full for tooltips,
// compact for axis ticks) and label truncation. Pure — no React.

import { formatMoney } from '@/lib/utils';

/** Categorical slots defined in globals.css (light + dark), in fixed order. */
export const SERIES_SLOTS = 8;

/** Colour of the folded "Other" bucket — a neutral, never a ninth hue. */
export const OTHER_COLOR = 'hsl(var(--chart-other))';

/**
 * Surface the chart sits on. Used for the 2px gap between touching marks and
 * the ring around hover dots; a host on a non-card surface overrides
 * `--chart-surface`.
 */
export const SURFACE_COLOR = 'var(--chart-surface, hsl(var(--card)))';

export function seriesColor(index: number): string {
  return `hsl(var(--chart-${(index % SERIES_SLOTS) + 1}))`;
}

export interface ValueFormat {
  /** Exact value, for tooltips and legends. */
  full: (value: number) => string;
  /** Short value, for axis ticks and tight spaces (₹1.2L, 45K). */
  compact: (value: number) => string;
}

const plain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const wholeRupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function valueFormat(money: boolean): ValueFormat {
  return {
    // Whole rupees drop the ".00" — paise only when there are paise.
    full: (v) =>
      money
        ? Number.isInteger(v)
          ? wholeRupees.format(v)
          : formatMoney(v)
        : plain.format(v),
    compact: (v) => formatCompact(v, money),
  };
}

/** Indian-scale compact number: 950, 1.2K, 3.5L, 1.25Cr (₹-prefixed for money). */
export function formatCompact(value: number, money = false): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  const [divisor, unit] =
    abs >= 1e7
      ? [1e7, 'Cr']
      : abs >= 1e5
        ? [1e5, 'L']
        : abs >= 1e3
          ? [1e3, 'K']
          : [1, ''];
  const scaled = abs / divisor;
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const body = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: digits,
  }).format(scaled);
  return `${value < 0 ? '-' : ''}${money ? '₹' : ''}${body}${unit}`;
}

/** Shortens a long category label for an axis tick; the tooltip shows it whole. */
export function truncateLabel(label: string, max = 12): string {
  return label.length > max ? `${label.slice(0, max - 1).trimEnd()}…` : label;
}

/**
 * Round axis ticks covering [min, max]: the smallest 1/2/2.5/5 × 10ⁿ step that
 * spans the data in at most `maxIntervals` steps. Recharts' own nice-tick
 * modes either pick odd steps (6.5K, 19.5K) or overshoot the data by ~60%.
 */
export function niceTicks(
  min: number,
  max: number,
  maxIntervals = 5
): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min > max) [min, max] = [max, min];
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
    min = min === 0 ? 0 : min - pad;
    max += pad;
  }
  let magnitude = 10 ** Math.floor(Math.log10((max - min) / maxIntervals));
  for (;;) {
    for (const multiple of [1, 2, 2.5, 5]) {
      const step = multiple * magnitude;
      const lo = Math.floor(min / step);
      const hi = Math.ceil(max / step);
      if (hi - lo <= maxIntervals) {
        return Array.from({ length: hi - lo + 1 }, (_, i) =>
          Number(((lo + i) * step).toPrecision(12))
        );
      }
    }
    magnitude *= 10;
  }
}
