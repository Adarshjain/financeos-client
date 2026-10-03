/**
 * The server's business calendar is IST (app.zone, UTC+05:30, no DST): its "today" is the IST
 * date, which differs from the UTC date between 18:30 and 24:00 UTC. Specs and fixtures derive
 * business dates from here so they agree with the server at any hour.
 */
const IST_OFFSET_MS = 330 * 60 * 1000;

/** Now, shifted so its UTC fields (getUTCFullYear/Month/Date) read as the IST wall clock. */
export function istNow(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** Today's IST date as YYYY-MM-DD, optionally offset by whole days. */
export function istToday(offsetDays = 0): string {
  const d = istNow();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
