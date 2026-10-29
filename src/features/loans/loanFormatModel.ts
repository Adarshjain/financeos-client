import { MONTH_SHORT } from '@/lib/format';

const DAY_MS = 86_400_000;

function parts(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) } : null;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number | null {
  const a = parts(from);
  const b = parts(to);
  if (!a || !b) return null;
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY_MS);
}

/** "5th", "22nd", "11th". */
export function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** "Apr – Oct 2026": the financial year's first month to today's month ("Apr 2026" in its first month). */
export function fyRangeLabel(fyStart: string, today: string): string {
  const s = parts(fyStart);
  const t = parts(today);
  if (!s || !t) return '';
  if (s.y === t.y && s.m === t.m) return `${MONTH_SHORT[t.m - 1]} ${t.y}`;
  if (s.y === t.y) return `${MONTH_SHORT[s.m - 1]} – ${MONTH_SHORT[t.m - 1]} ${t.y}`;
  return `${MONTH_SHORT[s.m - 1]} ${s.y} – ${MONTH_SHORT[t.m - 1]} ${t.y}`;
}

/** One KpiTile of a Loans & lendings tab. */
export interface TileModel {
  label: string;
  value: string;
  context: string;
  /** Green for money coming to you, red for trouble; absent = plain. */
  tone?: 'positive' | 'danger';
}
