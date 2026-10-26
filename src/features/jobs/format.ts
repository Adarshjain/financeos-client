import { hm12 } from '@/lib/clock12';
import { parseCalendarDate } from '@/lib/utils';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? (CALENDAR_DATE.test(value) ? parseCalendarDate(value) : new Date(value)) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "13 Oct", the list form. */
export function dayMonth(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
}

/** "13 Oct 2026". */
export function dayMonthYear(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

/** "9:00 am", 12-hour. */
export function clockTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? hm12(d.getHours(), d.getMinutes()) : '—';
}

/** "10 Oct 2026, 9:14 pm". */
export function longDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? `${dayMonthYear(d)}, ${clockTime(d)}` : '—';
}

/** "20/10/2026". */
export function numericDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '—';
}

/** "20/10/2026, 3:00 pm". */
export function numericDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? `${numericDate(d)}, ${clockTime(d)}` : '—';
}
