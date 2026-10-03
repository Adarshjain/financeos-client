// Compact date-range labels. Two full dates ("1 Sept 26 – 30 Sept 26") take a
// lot of room, so ranges are shortened, most specific rule first:
//
//   1. A whole named period gets its name: Sep, Q2 FY27, FY27, 2026, Jul – Aug.
//   2. A range ending today: Oct MTD, FYTD, YTD, Last 3m, Last 2y, Last 30d.
//   3. A range still running: 18 Sep → today · 14d left.
//   4. Anything else prints shared parts once: 1–15 Sep, 12 Aug – 3 Sep,
//      12 Dec 25 – 3 Jan 26. The year is dropped when it is the current year.
//
// Always pair the label with formatDateRangeFull() in a `title` so the exact
// dates stay one hover away.

import { formatDate, parseCalendarDate } from '@/lib/utils';

/** Mirrors the server's `financeos.reports.fiscal-year-start-month` (default April). */
export const FY_START_MONTH = 4;

/**
 * The zone business dates live in. Mirrors the server's AppTime zone, so the
 * "today" used here matches the one the server resolved ranges against, and
 * server render and hydration agree no matter where the code runs.
 */
const APP_ZONE = 'Asia/Kolkata';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

const DAY_MS = 86_400_000;

type DateInput = string | Date | null | undefined;

export interface DateRangeOptions {
  /** Today as YYYY-MM-DD; defaults to today in the app zone. For tests. */
  today?: string;
  /**
   * `to` is the first day OUTSIDE the range (reward rule `activeTo`), so the
   * label ends the day before it.
   */
  endExclusive?: boolean;
}

/** Today's calendar date (YYYY-MM-DD) in the app zone. */
export function todayInAppZone(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** The last day a range covers, honouring `endExclusive`. */
function lastDay(to: DateInput, options?: DateRangeOptions): Date | null {
  const end = toDay(to);
  return end && options?.endExclusive ? addDays(end, -1) : end;
}

/** Local-midnight Date, or null when absent/invalid. */
function toDay(value: DateInput): Date | null {
  if (!value) return null;
  const d =
    typeof value === 'string'
      ? CALENDAR_DATE.test(value)
        ? parseCalendarDate(value)
        : new Date(value)
      : value;
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Same day-of-month n months away, clamped to the month's end (like java.time). */
function addMonths(d: Date, n: number): Date {
  const lastDay = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), lastDay));
}

/** Whole days from a to b. Rounded so a DST shift cannot cost a day. */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function sameDay(a: Date, b: Date): boolean {
  return daysBetween(a, b) === 0;
}

function isMonthEnd(d: Date): boolean {
  return addDays(d, 1).getDate() === 1;
}

function yy(year: number): string {
  return String(year % 100).padStart(2, '0');
}

/** " 25" for a year other than the current one, else nothing. */
function yearSuffix(year: number, today: Date): string {
  return year === today.getFullYear() ? '' : ` ${yy(year)}`;
}

function fyStartOf(d: Date): Date {
  const candidate = new Date(d.getFullYear(), FY_START_MONTH - 1, 1);
  return d < candidate ? new Date(d.getFullYear() - 1, FY_START_MONTH - 1, 1) : candidate;
}

/** FY27 = the fiscal year ending in 2027. */
function fyLabel(fyStart: Date): string {
  const endYear = addDays(addMonths(fyStart, 12), -1).getFullYear();
  return `FY${yy(endYear)}`;
}

function dayLabel(d: Date, today: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${yearSuffix(d.getFullYear(), today)}`;
}

/** Rule 1: whole calendar year, fiscal year, fiscal quarter, month(s). */
function namedPeriod(from: Date, to: Date, today: Date): string | null {
  if (from.getDate() !== 1 || !isMonthEnd(to)) return null;

  if (from.getMonth() === 0 && to.getMonth() === 11 && from.getFullYear() === to.getFullYear()) {
    return String(from.getFullYear());
  }

  const fyStart = fyStartOf(from);
  if (sameDay(from, fyStart) && sameDay(to, addDays(addMonths(fyStart, 12), -1))) {
    return fyLabel(fyStart);
  }

  const monthsIntoFy = (from.getMonth() - fyStart.getMonth() + 12) % 12;
  if (monthsIntoFy % 3 === 0 && sameDay(to, addDays(addMonths(from, 3), -1))) {
    return `Q${monthsIntoFy / 3 + 1} ${fyLabel(fyStart)}`;
  }

  const fromMonth = MONTHS[from.getMonth()];
  const toMonth = MONTHS[to.getMonth()];
  if (from.getFullYear() === to.getFullYear()) {
    const suffix = yearSuffix(from.getFullYear(), today);
    return from.getMonth() === to.getMonth()
      ? `${fromMonth}${suffix}`
      : `${fromMonth} – ${toMonth}${suffix}`;
  }
  return `${fromMonth} ${yy(from.getFullYear())} – ${toMonth} ${yy(to.getFullYear())}`;
}

/** Rule 2: a range that ends today. */
function toDateLabel(from: Date, today: Date): string {
  if (sameDay(from, new Date(today.getFullYear(), today.getMonth(), 1))) {
    return `${MONTHS[today.getMonth()]} MTD`;
  }
  if (sameDay(from, fyStartOf(today))) return 'FYTD';
  if (sameDay(from, new Date(today.getFullYear(), 0, 1))) return 'YTD';

  // The server's last_x_months / last_x_years: today minus n months, plus a day.
  const months =
    (today.getFullYear() - from.getFullYear()) * 12 + today.getMonth() - from.getMonth();
  if (months > 0 && sameDay(from, addDays(addMonths(today, -months), 1))) {
    return months % 12 === 0 ? `Last ${months / 12}y` : `Last ${months}m`;
  }
  return `Last ${daysBetween(from, today) + 1}d`;
}

/** Rule 4: print the parts both ends share once. */
function compressed(from: Date, to: Date, today: Date): string {
  if (from.getFullYear() !== to.getFullYear()) {
    return `${from.getDate()} ${MONTHS[from.getMonth()]} ${yy(from.getFullYear())} – ` +
      `${to.getDate()} ${MONTHS[to.getMonth()]} ${yy(to.getFullYear())}`;
  }
  const suffix = yearSuffix(to.getFullYear(), today);
  if (from.getMonth() === to.getMonth()) {
    return `${from.getDate()}–${to.getDate()} ${MONTHS[to.getMonth()]}${suffix}`;
  }
  return `${from.getDate()} ${MONTHS[from.getMonth()]} – ${to.getDate()} ${MONTHS[to.getMonth()]}${suffix}`;
}

interface Described {
  label: string;
  /** True when the label is a name (Sep, FY27, Yesterday), not dates. */
  named: boolean;
}

function describe(from: Date, to: Date, today: Date): Described {
  if (sameDay(from, to)) {
    if (sameDay(from, today)) return { label: 'Today', named: true };
    if (sameDay(from, addDays(today, -1))) return { label: 'Yesterday', named: true };
    return { label: dayLabel(from, today), named: false };
  }
  const named = namedPeriod(from, to, today);
  if (named) return { label: named, named: true };
  if (sameDay(to, today)) return { label: toDateLabel(from, today), named: true };
  if (from < today && today < to) {
    return {
      label: `${dayLabel(from, today)} → today · ${daysBetween(today, to)}d left`,
      named: false,
    };
  }
  return { label: compressed(from, to, today), named: false };
}

function resolveToday(options?: DateRangeOptions): Date {
  return parseCalendarDate(options?.today ?? todayInAppZone());
}

/**
 * Compact label for a date range; see the rules at the top of this file. A
 * missing end reads "since …", a missing start "until …", neither "All time".
 */
export function formatDateRange(from: DateInput, to: DateInput, options?: DateRangeOptions): string {
  const today = resolveToday(options);
  const start = toDay(from);
  const end = lastDay(to, options);
  if (!start && !end) return 'All time';
  if (!end) return `since ${dayLabel(start!, today)}`;
  if (!start) return `until ${dayLabel(end, today)}`;
  return describe(start, end, today).label;
}

/** Both ends written out in full, for a tooltip behind formatDateRange(). */
export function formatDateRangeFull(
  from: DateInput,
  to: DateInput,
  options?: Pick<DateRangeOptions, 'endExclusive'>,
): string {
  const start = toDay(from);
  const end = lastDay(to, options);
  if (!start && !end) return 'All time';
  if (!end) return `since ${formatDate(start)}`;
  if (!start) return `until ${formatDate(end)}`;
  if (sameDay(start, end)) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * Comparison label for a previous window, relative to the current one:
 * "vs Aug" for a named period, "vs prev 30d" for an equal-length window right
 * before an unnamed one, otherwise "vs" plus the compact previous range.
 */
export function formatComparedRange(
  previous: { from: string; to: string } | null | undefined,
  current: { from: string; to: string } | null | undefined,
  options?: DateRangeOptions,
): string {
  const prevFrom = toDay(previous?.from);
  const prevTo = toDay(previous?.to);
  if (!prevFrom || !prevTo) return 'vs previous period';

  const today = resolveToday(options);
  const prev = describe(prevFrom, prevTo, today);
  if (prev.named) {
    // Single days read as words mid-sentence: "vs yesterday".
    const label = prevFrom.getTime() === prevTo.getTime() ? prev.label.toLowerCase() : prev.label;
    return `vs ${label}`;
  }

  const curFrom = toDay(current?.from);
  const curTo = toDay(current?.to);
  if (curFrom && curTo) {
    const length = daysBetween(curFrom, curTo) + 1;
    const adjacent = sameDay(addDays(prevTo, 1), curFrom);
    if (adjacent && daysBetween(prevFrom, prevTo) + 1 === length && length > 1) {
      return `vs prev ${length}d`;
    }
  }
  return `vs ${prev.label}`;
}
