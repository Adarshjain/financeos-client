const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Formats a count with a cap (defaults to 99), e.g. "99+" when above max.
 */
export function formatCount(n: number | string, max = 99): string {
  const num = typeof n === 'number' ? n : parseInt(n, 10);
  if (isNaN(num)) return String(n);
  if (num > max) {
    return `${max}+`;
  }
  return String(num);
}

/**
 * Formats an ISO date string (yyyy-mm-dd or ISO timestamp).
 * - 'input': 'dd/mm/yyyy'
 * - 'list': '13 Oct'
 */
export function formatDate(iso: string, style: 'input' | 'list'): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const [, year, month, day] = match;
  if (style === 'input') {
    return `${day}/${month}/${year}`;
  }
  if (style === 'list') {
    const dayNum = parseInt(day, 10);
    const monthIdx = parseInt(month, 10) - 1;
    const shortName = MONTH_SHORT[monthIdx];
    if (!shortName) return '';
    return `${dayNum} ${shortName}`;
  }
  return '';
}

/**
 * Parses user input in dd/mm/yyyy format into an ISO yyyy-mm-dd string, or null if invalid.
 */
export function parseDateInput(text: string): string | null {
  if (!text) return null;
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, dStr, mStr, yStr] = match;
  const d = parseInt(dStr, 10);
  const m = parseInt(mStr, 10);
  const y = parseInt(yStr, 10);
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

/**
 * Returns today's ISO date string (yyyy-mm-dd) in the specified time zone (e.g. 'Asia/Kolkata').
 */
export function todayISO(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO year-month string (yyyy-mm or yyyy-mm-dd) as "Month YYYY" in English, e.g. "October 2026".
 */
export function formatMonth(iso: string): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})/);
  if (!match) return '';
  const [, year, month] = match;
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx];
  if (!monthName) return '';
  return `${monthName} ${year}`;
}

/**
 * Returns standard weekday letters (Monday first): ['M', 'T', 'W', 'T', 'F', 'S', 'S'].
 */
export function weekdayLetters(): string[] {
  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
}
