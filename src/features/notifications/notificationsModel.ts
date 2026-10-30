import { parsePage } from '@/features/shell/pagination';
import { appHref } from '@/features/shell/routes';
import type { AppNotification } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';
import { formatTime } from '@/lib/format';

export const NOTIFICATIONS_PAGE_SIZE = 25;
/** Rows in the bell's dropdown. */
export const DROPDOWN_SIZE = 10;

/** The 0-based page (the API's) of a query string: the address counts from 1 and omits the first page. */
export function pageFromSearch(search: string): number {
  return parsePage(Object.fromEntries(new URLSearchParams(search))).page;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Where a notification opens, or null when its refs do not say (the row is not clickable). */
export function notificationHref(n: Pick<AppNotification, 'kind' | 'refs'>): string | null {
  const { jobId, accountId } = n.refs ?? {};
  switch (n.kind) {
    case 'job_failed':
    case 'job_finished':
    case 'gmail_sync':
      return jobId ? appHref(`/settings/activity?job=${jobId}`) : appHref('/settings/activity');
    case 'statement_imported':
      return accountId ? appHref(`/accounts/${accountId}/statements`) : null;
    case 'gmail_disconnected':
      return appHref('/settings/connections');
    case 'reward_milestone':
    case 'reward_cap':
      return accountId ? appHref(`/accounts/${accountId}/rewards`) : null;
    case 'auto_linked':
      return appHref('/transactions');
    default:
      return null;
  }
}

/** The IST calendar day of an instant, "YYYY-MM-DD". */
function dayOf(createdAt: string): string {
  return todayInAppZone(new Date(createdAt));
}

// Calendar arithmetic on UTC-midnight dates, not a clock read: no zone is involved.
function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** "13 Oct", with the year when it is not the current one ("13 Oct 25"). */
function dayLabel(day: string, today: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const base = `${d} ${MONTHS[m - 1]}`;
  return y === Number(today.slice(0, 4)) ? base : `${base} ${String(y % 100).padStart(2, '0')}`;
}

/** "Today", "Yesterday" or "13 Oct" for the IST day of the instant. */
export function dayHeading(createdAt: string, now: Date = new Date()): string {
  const today = todayInAppZone(now);
  const day = dayOf(createdAt);
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return dayLabel(day, today);
}

export interface NotificationDayGroup {
  label: string;
  items: AppNotification[];
}

/** Items (already newest first) in runs of the same IST day, each with its heading. */
export function groupByDay(items: AppNotification[], now: Date = new Date()): NotificationDayGroup[] {
  const groups: NotificationDayGroup[] = [];
  let currentDay = '';
  for (const item of items) {
    const day = dayOf(item.createdAt);
    if (day !== currentDay || groups.length === 0) {
      groups.push({ label: dayHeading(item.createdAt, now), items: [] });
      currentDay = day;
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}

/** "2:05 pm" (12-hour, IST). */
export function timeLabel(createdAt: string): string {
  return formatTime(createdAt);
}

/** Time when it arrived today, else the date ("13 Oct"): the dropdown's subtitle tail. */
export function timeOrDateLabel(createdAt: string, now: Date = new Date()): string {
  const today = todayInAppZone(now);
  const day = dayOf(createdAt);
  return day === today ? timeLabel(createdAt) : dayLabel(day, today);
}
