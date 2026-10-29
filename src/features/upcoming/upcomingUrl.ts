import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

import { monthsToCover, parseCalendarMonth } from './calendarModel';
import { parseMonths } from './upcomingModel';

/** What an /upcoming address asks for: `?months=` is how far ahead the list reaches. */
export function parseUpcomingUrl(params: SearchParamsRecord): { months: number } {
  return { months: parseMonths(first(params.months)) };
}

/** What an /upcoming/calendar address asks for: `?month=` is the month shown, and how many months to fetch to cover it. */
export function parseUpcomingCalendarUrl(params: SearchParamsRecord, today: string): { month: string; months: number } {
  const month = parseCalendarMonth(first(params.month), today);
  return { month, months: monthsToCover(today, month) };
}
