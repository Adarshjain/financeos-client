import { describe, expect, it } from 'vitest';

import { ratioText } from './corporateActionRatio';

describe('ratioText', () => {
  it('reads a bonus as new shares for held shares', () => {
    expect(ratioText('bonus', 1, 2)).toBe('1 : 1');
    expect(ratioText('bonus', 2, 5, true)).toBe('3:2');
  });

  it('reads every other kind as from : to', () => {
    expect(ratioText('split', 1, 2)).toBe('1 : 2');
    expect(ratioText('demerger', 10, 1, true)).toBe('10:1');
    expect(ratioText('merger', 25, 42)).toBe('25 : 42');
  });

  it('is empty without both numbers', () => {
    expect(ratioText('split', null, 2)).toBe('');
  });
});
