import { describe, expect, it } from 'vitest';

import { isLivePrice, isMarketOpen } from './marketHoursModel';

// IST = UTC + 5:30. 2026-10-13 is a Tuesday, 2026-10-17 a Saturday, 2026-10-18 a Sunday.
const at = (iso: string) => new Date(iso);

describe('isMarketOpen', () => {
  it('opens at 09:15 IST and closes at 15:35 IST', () => {
    expect(isMarketOpen(at('2026-10-13T03:44:00Z'))).toBe(false); // 09:14
    expect(isMarketOpen(at('2026-10-13T03:45:00Z'))).toBe(true); // 09:15
    expect(isMarketOpen(at('2026-10-13T10:04:00Z'))).toBe(true); // 15:34
    expect(isMarketOpen(at('2026-10-13T10:05:00Z'))).toBe(false); // 15:35
  });

  it('is closed on Saturday and Sunday', () => {
    expect(isMarketOpen(at('2026-10-17T06:00:00Z'))).toBe(false);
    expect(isMarketOpen(at('2026-10-18T06:00:00Z'))).toBe(false);
  });

  it('uses the IST weekday, not the UTC one', () => {
    // Monday 00:30 IST is still Sunday in UTC; closed either way, and Friday 23:00 UTC is Saturday IST.
    expect(isMarketOpen(at('2026-10-16T23:00:00Z'))).toBe(false);
    // Monday 09:30 IST is Monday 04:00 UTC.
    expect(isMarketOpen(at('2026-10-12T04:00:00Z'))).toBe(true);
  });
});

describe('isLivePrice', () => {
  const now = at('2026-10-13T06:15:00Z'); // 11:45 IST, open
  it('is live for a price stamped today while open', () => {
    expect(isLivePrice('2026-10-13T11:40:00+05:30', now)).toBe(true);
  });
  it('is not live for yesterday, a missing time, or a closed market', () => {
    expect(isLivePrice('2026-10-12T15:30:00+05:30', now)).toBe(false);
    expect(isLivePrice(null, now)).toBe(false);
    expect(isLivePrice(undefined, now)).toBe(false);
    expect(isLivePrice('2026-10-13T15:30:00+05:30', at('2026-10-13T11:00:00Z'))).toBe(false);
  });
});
