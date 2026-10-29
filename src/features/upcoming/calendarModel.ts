import { formatCount, formatDate, formatMoney } from '@/lib/format';

import { type ObligationItem, obligationTitle, sumAmounts } from './obligationsModel';

/** The calendar shows the current month and this many after it (twelve months fetched in all). */
export const CALENDAR_MAX_OFFSET = 11;
/** The list's default range; the calendar never fetches fewer. */
const MIN_FETCH_MONTHS = 3;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Dated items keyed by their yyyy-mm-dd date, in the order given. */
export function groupByDate(items: ObligationItem[]): Map<string, ObligationItem[]> {
  const byDay = new Map<string, ObligationItem[]>();
  for (const i of items) {
    if (i.date) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
  }
  return byDay;
}

/** Months from today's month to `month` (both yyyy-mm); 0 for the current month. */
export function monthOffset(today: string, month: string): number {
  return (
    (Number(month.slice(0, 4)) - Number(today.slice(0, 4))) * 12 +
    Number(month.slice(5, 7)) -
    Number(today.slice(5, 7))
  );
}

/** yyyy-mm shifted by `n` months. */
export function shiftMonth(month: string, n: number): string {
  const idx = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** The month a `?month=` value names, kept inside the range the calendar can show; else today's month. */
export function parseCalendarMonth(value: string | null | undefined, today: string): string {
  const current = today.slice(0, 7);
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return current;
  const offset = monthOffset(today, value);
  return offset >= 0 && offset <= CALENDAR_MAX_OFFSET ? value : current;
}

/** How many months to fetch so `month` is fully covered. */
export function monthsToCover(today: string, month: string): number {
  return Math.max(MIN_FETCH_MONTHS, monthOffset(today, month) + 1);
}

/** The query string for the shown month: `month` only when not the current month; other params stay. */
export function calendarSearch(current: string, month: string, today: string): string {
  const params = new URLSearchParams(current);
  params.delete('month');
  if (month !== today.slice(0, 7)) params.set('month', month);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** The day the calendar starts on: today in the shown month, else its first day with items, else the 1st. */
export function defaultSelectedDay(
  month: string,
  today: string,
  byDay: Map<string, ObligationItem[]>,
): string {
  if (today.startsWith(month)) return today;
  const first = [...byDay.keys()].filter((d) => d.startsWith(month)).sort()[0];
  return first ?? `${month}-01`;
}

/** The month's dated items. */
export function itemsInMonth(items: ObligationItem[], month: string): ObligationItem[] {
  return items.filter((i) => i.date?.startsWith(month));
}

/** "₹1,05,219 due · 4 overdue" over the month's dated items; the parts with nothing in them are left out. */
export function monthSummary(monthItems: ObligationItem[]): string {
  const withAmount = monthItems.some((i) => i.amount != null);
  const overdue = monthItems.filter((i) => i.status === 'overdue').length;
  return [
    withAmount ? `${formatMoney(sumAmounts(monthItems))} due` : null,
    overdue > 0 ? `${overdue} overdue` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "Tue 13 Oct". */
export function dayTitle(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${formatDate(iso, 'list')}`;
}

/** "2 items · ₹51,440" (the total only when a row carries an amount). */
export function daySubtitle(dayItems: ObligationItem[]): string {
  const total = dayItems.some((i) => i.amount != null) ? formatMoney(sumAmounts(dayItems)) : null;
  return [formatCount(dayItems.length, ['item', 'items']), total].filter(Boolean).join(' · ');
}

/** "₹36.6K", "₹12K", "₹1.05L": the amount of a chip. */
export function shortAmount(value: number): string {
  return formatMoney(value, { compact: 'k' });
}

const CHIP_NAME_MAX = 12;

/** The chip text: the name cut with "…" so the amount always fits, then the short amount (a row with no amount keeps its whole name). */
export function chipLabel(item: ObligationItem): string {
  const name = obligationTitle(item).trim();
  if (item.amount == null) return name;
  const cut = name.length > CHIP_NAME_MAX ? `${name.slice(0, CHIP_NAME_MAX).trimEnd()}…` : name;
  const money = item.type === 'lending_due' && item.direction === 'lent' ? '+' : '';
  return `${cut} ${money}${shortAmount(item.amount)}`;
}

export type CalendarTone = 'danger' | 'warning' | 'info' | 'positive' | 'neutral';

/** Overdue danger, due within 7 days warning, lending info (money in success), the rest neutral. */
export function chipTone(item: ObligationItem): CalendarTone {
  if (item.status === 'overdue') return 'danger';
  if (item.type === 'lending_due') return item.direction === 'lent' ? 'positive' : 'info';
  if (item.daysUntil != null && item.daysUntil >= 0 && item.daysUntil <= 7) return 'warning';
  return 'neutral';
}
