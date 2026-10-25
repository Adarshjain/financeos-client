import { todayInAppZone } from '@/lib/date-range';

const IST_OFFSET_MS = 330 * 60_000;
/** 09:15 and 15:35 IST, in minutes after midnight. */
const OPEN_MIN = 9 * 60 + 15;
const CLOSE_MIN = 15 * 60 + 35;

/** True on Mon–Fri between 09:15 and 15:35 IST (end exclusive), whatever the machine's timezone. */
export function isMarketOpen(now: Date): boolean {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return minutes >= OPEN_MIN && minutes < CLOSE_MIN;
}

/** A price with a time, stamped today (IST), while the market is open. */
export function isLivePrice(priceAt: string | null | undefined, now: Date): boolean {
  if (!priceAt) return false;
  const at = new Date(priceAt);
  if (Number.isNaN(at.getTime())) return false;
  return todayInAppZone(at) === todayInAppZone(now) && isMarketOpen(now);
}
