import { describe, expect, it } from 'vitest';

import { utilisationTone } from '@/lib/utilisation';

describe('utilisationTone', () => {
  it('is emerald below 30, amber from 30 to below 70, rose from 70', () => {
    expect(utilisationTone(0)).toBe('low');
    expect(utilisationTone(29.99)).toBe('low');
    expect(utilisationTone(30)).toBe('medium');
    expect(utilisationTone(69.99)).toBe('medium');
    expect(utilisationTone(70)).toBe('high');
    expect(utilisationTone(150)).toBe('high');
  });

  it('treats a missing, non-finite or negative (in credit) percent as low', () => {
    expect(utilisationTone(null)).toBe('low');
    expect(utilisationTone(undefined)).toBe('low');
    expect(utilisationTone(Number.NaN)).toBe('low');
    expect(utilisationTone(Number.POSITIVE_INFINITY)).toBe('low');
    expect(utilisationTone(-12)).toBe('low');
  });
});
