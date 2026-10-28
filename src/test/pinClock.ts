import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Pins `Date` (timers keep running) to 29 Oct 2026, 11:30 IST for every test in the file. Dates in the list style drop
 * the year only in the current IST year, so a test whose fixtures are in 2026 must not depend on the real clock.
 */
export function pinClock(iso = '2026-10-29T06:00:00Z'): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(iso));
  });
  afterEach(() => vi.useRealTimers());
}
