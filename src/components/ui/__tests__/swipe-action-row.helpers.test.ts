import { describe, expect, it } from 'vitest';

import {
  AXIS_LOCK_PX,
  COMMIT_PX,
  computeSwipeOffset,
  isCommitted,
  MAX_REVEAL_PX,
  resolveAxis,
} from '@/components/ui/swipe-action-row.helpers';

const both = { hasLeading: true, hasTrailing: true };

describe('resolveAxis', () => {
  it('is undecided while both axes are under the lock distance', () => {
    expect(resolveAxis(AXIS_LOCK_PX - 1, AXIS_LOCK_PX - 1)).toBeNull();
    expect(resolveAxis(0, 0)).toBeNull();
  });

  it('locks horizontal when horizontal travel dominates', () => {
    expect(resolveAxis(AXIS_LOCK_PX, 2)).toBe('horizontal');
    expect(resolveAxis(-AXIS_LOCK_PX, 2)).toBe('horizontal');
  });

  it('locks vertical when vertical travel dominates', () => {
    expect(resolveAxis(2, AXIS_LOCK_PX)).toBe('vertical');
    expect(resolveAxis(2, -AXIS_LOCK_PX)).toBe('vertical');
  });

  it('resolves a diagonal tie as vertical so page scroll wins', () => {
    expect(resolveAxis(AXIS_LOCK_PX, AXIS_LOCK_PX)).toBe('vertical');
  });
});

describe('computeSwipeOffset', () => {
  it('clamps rightward travel to 0 when there is no leading action', () => {
    expect(computeSwipeOffset(50, { hasLeading: false, hasTrailing: true })).toBe(0);
  });

  it('clamps leftward travel to 0 when there is no trailing action', () => {
    expect(computeSwipeOffset(-50, { hasLeading: true, hasTrailing: false })).toBe(0);
  });

  it('tracks travel 1:1 up to the reveal width in either direction', () => {
    expect(computeSwipeOffset(40, both)).toBe(40);
    expect(computeSwipeOffset(-40, both)).toBe(-40);
    expect(computeSwipeOffset(MAX_REVEAL_PX, both)).toBe(MAX_REVEAL_PX);
  });

  it('rubber-bands travel beyond the reveal width at a quarter rate, keeping the sign', () => {
    expect(computeSwipeOffset(MAX_REVEAL_PX + 40, both)).toBe(MAX_REVEAL_PX + 10);
    expect(computeSwipeOffset(-(MAX_REVEAL_PX + 40), both)).toBe(-(MAX_REVEAL_PX + 10));
  });

  it('returns 0 for no travel', () => {
    expect(computeSwipeOffset(0, both)).toBe(0);
  });
});

describe('isCommitted', () => {
  it('is false just under the commit distance', () => {
    expect(isCommitted(COMMIT_PX - 1)).toBe(false);
  });

  it('is true at and beyond the commit distance in either direction', () => {
    expect(isCommitted(COMMIT_PX)).toBe(true);
    expect(isCommitted(-COMMIT_PX)).toBe(true);
  });
});
