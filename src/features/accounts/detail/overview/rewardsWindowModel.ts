export interface RewardsWindow {
  from: string;
  to: string;
  calendarYear: boolean;
}

// Calendar arithmetic on UTC-midnight dates, not a clock read: no zone is involved.
function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * The window a card's rewards are reported over: the anniversary year containing `today`
 * (from the anniversary day to the day before the next one), else the calendar year.
 */
export function rewardsWindowFor(
  anniversaryDate: string | null | undefined,
  today: string
): RewardsWindow {
  const year = Number(today.slice(0, 4));
  const m = anniversaryDate ? /^\d{4}-(\d{2})-(\d{2})/.exec(anniversaryDate) : null;
  if (!m) return { from: `${year}-01-01`, to: `${year}-12-31`, calendarYear: true };
  const month = Number(m[1]) - 1;
  const day = Number(m[2]);
  // Date.UTC rolls 29 Feb into 1 Mar in a non-leap year, which is where that anniversary falls.
  let start = Date.UTC(year, month, day);
  if (iso(start) > today) start = Date.UTC(year - 1, month, day);
  const startYear = new Date(start).getUTCFullYear();
  const end = Date.UTC(startYear + 1, month, day) - 86_400_000;
  return { from: iso(start), to: iso(end), calendarYear: false };
}
