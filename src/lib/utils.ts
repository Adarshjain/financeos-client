import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** @deprecated Dinero code formats through '@/lib/format'. */
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

/** @deprecated Dinero code formats through '@/lib/format'. */
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

/**
 * Sanitizes a decimal text input: keeps digits and at most one dot, drops sign
 * and other characters. Shared by the amount/rate/cap inputs across forms.
 */
export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
}
