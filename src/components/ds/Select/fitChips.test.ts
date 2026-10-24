import { describe, expect, it } from 'vitest';

import { fitChips } from './fitChips';

describe('fitChips', () => {
  it('shows every chip when they all fit, with no room kept for +n', () => {
    expect(fitChips([60, 60, 60], 30, 190, 4)).toBe(3);
    expect(fitChips([60, 60, 60], 30, 188, 4)).toBe(3);
  });

  it('drops chips until the +n badge fits beside the rest', () => {
    // 3 chips need 188; at 150: badge 30 + 4 + 60 + 4 + 60 = 158 > 150, so only one chip stays.
    expect(fitChips([60, 60, 60], 30, 150, 4)).toBe(1);
    expect(fitChips([60, 60, 60], 30, 158, 4)).toBe(2);
  });

  it('shows only the +n badge when not even one chip fits beside it', () => {
    expect(fitChips([100, 100], 30, 120, 4)).toBe(0);
  });

  it('shows every chip while nothing is measured', () => {
    expect(fitChips([0, 0], 0, 0, 0)).toBe(2);
  });

  it('handles no chips', () => {
    expect(fitChips([], 30, 100, 4)).toBe(0);
  });
});
