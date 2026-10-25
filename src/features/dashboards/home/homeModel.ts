import { hourInAppZone, weekdayDayMonthInAppZone } from '@/lib/date-range';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Good morning" until noon, "Good afternoon" until 5 pm, "Good evening" after: by the hour in the app zone, never the browser's. */
export function greetingFor(now: Date): string {
  const hour = hourInAppZone(now);
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** The first word of the user's name; undefined when they have none. */
export function firstName(displayName: string | null | undefined): string | undefined {
  return displayName?.trim().split(/\s+/)[0] || undefined;
}

/** "Good afternoon, Arjun"; just the greeting for a user without a name. */
export function greetingLine(now: Date, displayName: string | null | undefined): string {
  const name = firstName(displayName);
  return name ? `${greetingFor(now)}, ${name}` : greetingFor(now);
}

/** "synced 4 min ago"; undefined when there is no sync time. */
export function syncedAgo(iso: string | null | undefined, now: Date): string | undefined {
  if (!iso) return undefined;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return undefined;
  const elapsed = Math.max(0, now.getTime() - then);
  if (elapsed < MINUTE) return 'synced just now';
  if (elapsed < HOUR) return `synced ${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `synced ${Math.floor(elapsed / HOUR)} h ago`;
  return `synced ${Math.floor(elapsed / DAY)} d ago`;
}

/** The most recent sync across the Gmail mailboxes; undefined when none has synced. */
export function latestSync(connections: readonly { lastSyncedAt?: string | null }[]): string | undefined {
  let latest: string | undefined;
  for (const c of connections) {
    if (c.lastSyncedAt && (!latest || new Date(c.lastSyncedAt).getTime() > new Date(latest).getTime())) latest = c.lastSyncedAt;
  }
  return latest;
}

/** "2 things need you"; undefined when nothing does (or the count is unknown). */
export function needsYouText(count: number | null | undefined): string | undefined {
  if (!count || count < 1) return undefined;
  return count === 1 ? '1 thing needs you' : `${count} things need you`;
}

/** "Tuesday 13 Oct · 2 things need you · synced 4 min ago"; each part is left out when it has no data. */
export function statusLine({ now, needsYou, lastSyncedAt }: { now: Date; needsYou?: number | null; lastSyncedAt?: string | null }): string {
  return [weekdayDayMonthInAppZone(now), needsYouText(needsYou), syncedAgo(lastSyncedAt, now)].filter(Boolean).join(' · ');
}
