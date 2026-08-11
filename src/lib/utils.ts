import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: string | number | null | undefined): string {
  if (amount === undefined || amount === null) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(num);
}

export function formatCurrency(amount: string | number | null | undefined): string {
  return formatMoney(amount);
}

export function formatNumber(val: string | number | null | undefined): string {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}

export function formatNullableMoney(amount: string | number | null | undefined): string {
  if (amount === undefined || amount === null) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';
  return formatMoney(num);
}

/**
 * Matches a plain calendar date (the API's `format: date`), as opposed to a
 * full timestamp (`format: date-time`).
 */
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Serialise a Date as a plain calendar date (YYYY-MM-DD) from its *local*
 * components.
 *
 * Never use `toISOString().split('T')[0]` for this: it converts through UTC
 * first, so a user east of Greenwich picking a date in the early hours gets the
 * previous day (IST 25 Jul 01:30 → "2026-07-24").
 */
export function toCalendarDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Parse a plain calendar date (YYYY-MM-DD) into a Date at *local* midnight.
 *
 * Never use `new Date('2026-07-25')` for this: the spec parses a bare date as
 * UTC midnight, which renders as the previous day anywhere west of Greenwich.
 */
export function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  // Calendar dates are timezone-free and must not round-trip through UTC;
  // timestamps are instants and are correctly rendered in local time.
  const d =
    typeof date === 'string'
      ? CALENDAR_DATE.test(date)
        ? parseCalendarDate(date)
        : new Date(date)
      : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  }).replace(/\u00A0/g, ' ');
}

export function getAccountTypeLabel(type: string | undefined): string {
  if (!type) return 'Unknown';
  const labels: Record<string, string> = {
    bank_account: 'Bank Account',
    credit_card: 'Credit Card',
    broker: 'Broker',
    generic: 'Generic',
    checking: 'Checking',
    savings: 'Savings',
    investment: 'Investment',
    loan: 'Loan',
    other: 'Other',
  };
  return labels[type.toLowerCase()] || type;
}

/**
 * Resolve an account id to its display name.
 *
 * Was copy-pasted verbatim into three transaction components, so any change to
 * the fallback behaviour meant finding all of them.
 */
export function getAccountName(
  accounts: { id: string; name: string }[],
  accountId: string | undefined,
): string {
  // Matches the behaviour of the copies it replaces: em dash when there is no
  // id at all, 'Unknown' when the id doesn't resolve to a loaded account.
  if (!accountId) return '—';
  return accounts.find((a) => a.id === accountId)?.name || 'Unknown';
}

/** Largest-first, so the first unit the elapsed time reaches is the one used. */
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * A timestamp as elapsed time — "3 days ago", "yesterday", "in 2 hours".
 *
 * Replaces the single `date-fns/formatDistanceToNow` call that was the only use
 * of that dependency in the whole app, while `Intl.RelativeTimeFormat` does the
 * job natively (and every other date helper here is already native).
 *
 * `numeric: 'auto'` is what yields "yesterday" rather than "1 day ago".
 */
export function formatRelativeTime(
  date: string | Date | null | undefined,
  locale = 'en-IN',
): string {
  if (!date) return 'never';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 'never';

  const elapsed = d.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return formatter.format(Math.round(elapsed / ms), unit);
    }
  }
  // Under a minute: "now" reads better than "in 0 seconds".
  return formatter.format(Math.round(elapsed / 1000), 'second');
}

export function getPositionLabel(position: string | undefined): string {
  if (!position) return 'Asset';
  return position === 'liability' ? 'Liability' : 'Asset';
}

export function formatMonthYear(date: Date, locale = 'en-IN') {
  const month = date.toLocaleString(locale, { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);

  return `${month.slice(0,3)} ${year}`;
}

export function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isWithinLastNDays(date: Date, days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffInDays = (+today - +target) / (1000 * 60 * 60 * 24);

  return diffInDays >= 0 && diffInDays < days;
}

/**
 * Sanitizes a decimal text input: keeps digits and at most one dot, drops sign
 * and other characters. Shared by the amount/rate/cap inputs across forms.
 */
export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
}
