import { describe, expect, it } from 'vitest';

import { rewardsWindowFor } from './rewardsWindowModel';

describe('rewardsWindowFor', () => {
  it('uses the anniversary year that began earlier this calendar year', () => {
    expect(rewardsWindowFor('2023-03-15', '2026-10-13')).toEqual({
      from: '2026-03-15',
      to: '2027-03-14',
      calendarYear: false,
    });
  });

  it('uses the one that began last calendar year when the anniversary is still ahead', () => {
    expect(rewardsWindowFor('2023-12-01', '2026-10-13')).toEqual({
      from: '2025-12-01',
      to: '2026-11-30',
      calendarYear: false,
    });
  });

  it('starts a new window on the anniversary day itself', () => {
    expect(rewardsWindowFor('2023-10-13', '2026-10-13').from).toBe('2026-10-13');
  });

  it('falls back to the calendar year without an anniversary date', () => {
    const calendar = { from: '2026-01-01', to: '2026-12-31', calendarYear: true };
    expect(rewardsWindowFor(null, '2026-10-13')).toEqual(calendar);
    expect(rewardsWindowFor(undefined, '2026-10-13')).toEqual(calendar);
  });
});
