import { describe, expect, it } from 'vitest';

import { fyLabel, moveTone } from './investmentsFormatModel';

describe('investments formatting', () => {
  it('colours a move green or red, and leaves nothing and zero plain', () => {
    expect(moveTone(5)).toBe('positive');
    expect(moveTone(-5)).toBe('danger');
    expect(moveTone(0)).toBeUndefined();
    expect(moveTone(null)).toBeUndefined();
  });

  it('labels a financial year from its start year', () => {
    expect(fyLabel(2026)).toBe('FY 26-27');
  });
});
