import { describe, expect, it } from 'vitest';

import type { MilestoneStatus } from '@/lib/rewards.types';

import { currentMilestones } from './milestones';

describe('currentMilestones', () => {
  const w = (id: string, start: string, end: string) => ({ milestoneId: id, windowStart: start, windowEnd: end }) as MilestoneStatus;
  it('keeps the window containing today per milestone', () => {
    const out = currentMilestones([w('a', '2025-03-15', '2026-03-14'), w('a', '2026-03-15', '2027-03-14'), w('b', '2026-10-01', '2026-10-31')], '2026-10-13');
    expect(out.map((m) => `${m.milestoneId}:${m.windowStart}`)).toEqual(['a:2026-03-15', 'b:2026-10-01']);
  });
  it('takes the latest window when none contains today', () => {
    const out = currentMilestones([w('a', '2024-01-01', '2024-12-31'), w('a', '2025-01-01', '2025-12-31')], '2026-10-13');
    expect(out.map((m) => m.windowStart)).toEqual(['2025-01-01']);
  });
});
