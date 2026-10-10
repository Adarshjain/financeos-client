// The spending calendar's grid: weeks as columns (Monday first), one cell per
// day from the start of the window to today, each day's spend bucketed into
// five intensity levels (0 = nothing spent, 1–4 by quartile of the spending
// days, so one big day doesn't wash the rest out).

import type { ChartData } from '@/lib/reports.types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

export interface HeatCell {
  /** YYYY-MM-DD. */
  date: string;
  amount: number;
  /** 0 (no spend) … 4 (heaviest quarter of spending days). */
  level: number;
  isToday: boolean;
}

export interface HeatWeek {
  /** Monday of the week, YYYY-MM-DD. */
  start: string;
  /** Mon…Sun; null = outside the window (before it starts, or after today). */
  days: (HeatCell | null)[];
  /** Short month name when a month starts in this week (or it is the first week). */
  monthLabel: string | null;
}

export interface HeatmapModel {
  weeks: HeatWeek[];
  /** Days with any spend. */
  spendDays: number;
}

/** A day bucket label ("09 Oct 26") or ISO date as YYYY-MM-DD; null when unreadable. */
export function parseDayLabel(label: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(label);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{2,4})$/.exec(label.trim());
  if (!m) return null;
  const month = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (month < 0) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return `${year}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function toMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Monday on or before the date. */
function mondayOf(ms: number): number {
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // Mon = 0
  return ms - dow * DAY_MS;
}

/** The first day of the window: `months` back from today, the day after (a rolling window ending today). */
export function windowStart(today: string, months: number): string {
  const [y, m, d] = today.split('-').map(Number);
  const back = new Date(Date.UTC(y, m - 1 - months, 1));
  const lastDay = new Date(Date.UTC(back.getUTCFullYear(), back.getUTCMonth() + 1, 0)).getUTCDate();
  back.setUTCDate(Math.min(d, lastDay));
  return fromMs(back.getTime() + DAY_MS);
}

/** Spend per day from the chart (first series aligned to the day categories). */
export function spendByDay(data: ChartData): Map<string, number> {
  const series = data.series[0]?.data ?? [];
  const out = new Map<string, number>();
  data.categories.forEach((label, i) => {
    const day = parseDayLabel(label);
    const v = series[i];
    if (day && v != null && Number.isFinite(v)) out.set(day, (out.get(day) ?? 0) + Math.abs(v));
  });
  return out;
}

/** Quartile cut points of the positive amounts (ascending). */
export function quartiles(amounts: number[]): [number, number, number] {
  const sorted = amounts.filter((a) => a > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [0, 0, 0];
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))];
  return [at(0.25), at(0.5), at(0.75)];
}

export function levelOf(amount: number, cuts: [number, number, number]): number {
  if (amount <= 0) return 0;
  return 1 + cuts.filter((c) => amount > c).length;
}

/**
 * The calendar for the chart's window (its resolved date range, else `months`
 * back from today) up to today: whole Monday-first weeks, days outside the
 * window left empty.
 */
export function buildHeatmap(data: ChartData, today: string, months: number): HeatmapModel {
  const byDay = spendByDay(data);
  const range = data.meta?.dateRange;
  const from = range?.from ?? windowStart(today, months);
  const to = range?.to && range.to < today ? range.to : today;
  const cuts = quartiles([...byDay.values()]);
  const fromMsV = toMs(from);
  const toMsV = toMs(to);
  const todayMs = toMs(today);

  const weeks: HeatWeek[] = [];
  let lastLabelledMonth = -1;
  for (let start = mondayOf(fromMsV); start <= toMsV; start += 7 * DAY_MS) {
    const days: (HeatCell | null)[] = [];
    let monthLabel: string | null = null;
    for (let i = 0; i < 7; i++) {
      const ms = start + i * DAY_MS;
      if (ms < fromMsV || ms > toMsV) {
        days.push(null);
        continue;
      }
      const date = fromMs(ms);
      const month = new Date(ms).getUTCMonth();
      if (month !== lastLabelledMonth && (weeks.length === 0 || date.endsWith('-01'))) {
        monthLabel = MONTHS[month];
        lastLabelledMonth = month;
      }
      const amount = byDay.get(date) ?? 0;
      days.push({ date, amount, level: levelOf(amount, cuts), isToday: ms === todayMs });
    }
    weeks.push({ start: fromMs(start), days, monthLabel });
  }
  return { weeks, spendDays: [...byDay.values()].filter((v) => v > 0).length };
}
