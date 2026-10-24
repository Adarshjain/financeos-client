import type { RewardsWindow } from '../overview/rewardsWindow';
import { rewardsWindowFor } from '../overview/rewardsWindow';

export type RangePreset =
  | 'THIS_ANNIVERSARY_YEAR'
  | 'LAST_ANNIVERSARY_YEAR'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'LAST_3_MONTHS'
  | 'THIS_FY'
  | 'CUSTOM';

export const RANGE_PRESETS: readonly RangePreset[] = [
  'THIS_ANNIVERSARY_YEAR',
  'LAST_ANNIVERSARY_YEAR',
  'THIS_MONTH',
  'LAST_MONTH',
  'LAST_3_MONTHS',
  'THIS_FY',
  'CUSTOM',
];

export function isRangePreset(v: string): v is RangePreset {
  return (RANGE_PRESETS as readonly string[]).includes(v);
}

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  THIS_ANNIVERSARY_YEAR: 'This anniversary year',
  LAST_ANNIVERSARY_YEAR: 'Previous anniversary year',
  THIS_MONTH: 'This month',
  LAST_MONTH: 'Last month',
  LAST_3_MONTHS: 'Last 3 months',
  THIS_FY: 'This FY',
  CUSTOM: 'Custom range',
};

/** The period a card's rewards open on: its current reward year. Not written to the address. */
export const DEFAULT_PERIOD: RangePreset = 'THIS_ANNIVERSARY_YEAR';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written YYYY-MM-DD. */
export function isIsoDate(value: string | undefined): value is string {
  if (!value || !ISO.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return iso(Date.UTC(y, m - 1, d + n));
}

/** The first day of the month `offset` months from the month of `day`. */
function monthStart(day: string, offset: number): string {
  const [y, m] = day.split('-').map(Number);
  return iso(Date.UTC(y, m - 1 + offset, 1));
}

export interface PeriodQuery {
  period?: RangePreset;
  from?: string;
  to?: string;
}

/**
 * The dates a period covers, from the business date `today` (never the device clock).
 * `base` is the card's current reward year as the server reports it: it is the default period and
 * the anchor of the previous one. A custom range with a missing or invalid end takes that end from `base`.
 */
export function resolvePeriod(
  query: PeriodQuery,
  base: RewardsWindow,
  today: string,
  anniversary: string | null | undefined
): RewardsWindow {
  switch (query.period ?? DEFAULT_PERIOD) {
    case 'THIS_ANNIVERSARY_YEAR':
      return base;
    case 'LAST_ANNIVERSARY_YEAR':
      // The reward year containing the day before this one starts.
      return rewardsWindowFor(base.calendarYear ? null : anniversary, addDays(base.from, -1));
    case 'THIS_MONTH':
      return { from: monthStart(today, 0), to: today, calendarYear: false };
    case 'LAST_MONTH':
      return { from: monthStart(today, -1), to: addDays(monthStart(today, 0), -1), calendarYear: false };
    case 'LAST_3_MONTHS':
      return { from: monthStart(today, -2), to: today, calendarYear: false };
    case 'THIS_FY': {
      // Indian financial year: 1 April onwards.
      const [y, m] = today.split('-').map(Number);
      return { from: `${m >= 4 ? y : y - 1}-04-01`, to: today, calendarYear: false };
    }
    case 'CUSTOM': {
      let from = isIsoDate(query.from) ? query.from : base.from;
      let to = isIsoDate(query.to) ? query.to : base.to;
      if (from > to) [from, to] = [to, from];
      return { from, to, calendarYear: false };
    }
  }
}

/** How the period reads in a sentence: "this anniversary year", "previous calendar year", "last 3 months". */
export function periodWords(preset: RangePreset | undefined, window: RewardsWindow): string {
  const kind = window.calendarYear ? 'calendar' : 'anniversary';
  switch (preset ?? DEFAULT_PERIOD) {
    case 'THIS_ANNIVERSARY_YEAR':
      return `this ${kind} year`;
    case 'LAST_ANNIVERSARY_YEAR':
      return `previous ${kind} year`;
    case 'THIS_MONTH':
      return 'this month';
    case 'LAST_MONTH':
      return 'last month';
    case 'LAST_3_MONTHS':
      return 'last 3 months';
    case 'THIS_FY':
      return 'this FY';
    case 'CUSTOM':
      return 'custom range';
  }
}

/** The first letter in capitals, for a window word that is a label or starts a segment: "This anniversary year". */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
