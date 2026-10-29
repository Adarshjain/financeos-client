function toUtc(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Whole days from `from` to `to` (calendar dates, YYYY-MM-DD); negative when `to` is earlier; null when either is not a date. */
export function daysBetween(from: string, to: string): number | null {
  const a = toUtc(from);
  const b = toUtc(to);
  return a == null || b == null ? null : Math.round((b - a) / 86_400_000);
}
