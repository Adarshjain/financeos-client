import { todayInAppZone } from '@/lib/date-range';

export type DateStyle = 'list' | 'full' | 'input' | 'relative' | 'month';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const IST_OFFSET_MS = 330 * 60 * 1000;

type Ymd = { y: number; m: number; d: number };

/** The IST calendar date of an instant. */
export function istParts(at: Date): { ymd: Ymd; h: number; min: number; s: number } {
  const t = new Date(at.getTime() + IST_OFFSET_MS);
  return {
    ymd: { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() },
    h: t.getUTCHours(),
    min: t.getUTCMinutes(),
    s: t.getUTCSeconds(),
  };
}

function validYmd({ y, m, d }: Ymd): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** A calendar date as-is, or an instant converted to its IST date. Null when invalid. */
function toYmd(value: string | Date | null | undefined): Ymd | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : istParts(value).ymd;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(.*))?$/.exec(value);
  if (!m) return null;
  const rest = m[4];
  if (rest === undefined || !/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(rest)) {
    const ymd = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
    return validYmd(ymd) ? ymd : null;
  }
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : istParts(at).ymd;
}

const key = ({ y, m, d }: Ymd) => y * 10000 + m * 100 + d;

function dayBefore({ y, m, d }: Ymd): Ymd {
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * One date, five styles: list "13 Oct" (adds the year when it is not the current one), full "13 Oct 2026",
 * input "13/10/2026", month "October 2026", relative "Today" / "Yesterday" else the list form
 * (inline: lower-case, for mid-sentence use). A plain date is used as-is; an instant is read in IST.
 */
export function formatDate(
  value: string | Date | null | undefined,
  style: DateStyle,
  opts: { today?: string; inline?: boolean } = {},
): string {
  const ymd = toYmd(value);
  if (!ymd) return '';
  const short = `${ymd.d} ${MONTH_SHORT[ymd.m - 1]}`;
  const today = toYmd(opts.today ?? todayInAppZone()) ?? istParts(new Date()).ymd;
  const list = () => (ymd.y === today.y ? short : `${short} ${ymd.y}`);
  switch (style) {
    case 'full':
      return `${short} ${ymd.y}`;
    case 'input':
      return `${pad(ymd.d)}/${pad(ymd.m)}/${ymd.y}`;
    case 'month':
      return `${MONTH_LONG[ymd.m - 1]} ${ymd.y}`;
    case 'relative': {
      const word = key(ymd) === key(today) ? 'Today' : key(ymd) === key(dayBefore(today)) ? 'Yesterday' : null;
      if (!word) return list();
      return opts.inline ? word.toLowerCase() : word;
    }
    default:
      return list();
  }
}
