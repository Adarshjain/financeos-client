import { describe, expect, it } from 'vitest';

import {
  formatUtilisation,
  utilisationBarWidth,
  utilisationTone,
  utilisationToneClasses,
} from '@/lib/utilisation';

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

describe('utilisationToneClasses', () => {
  it('gives bar and text classes per band, rose as the only danger colour', () => {
    expect(utilisationToneClasses(10)).toEqual({
      tone: 'low', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400',
    });
    expect(utilisationToneClasses(45)).toEqual({
      tone: 'medium', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400',
    });
    expect(utilisationToneClasses(85)).toEqual({
      tone: 'high', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400',
    });
  });
});

describe('utilisationBarWidth', () => {
  it('clamps to 0–100%', () => {
    expect(utilisationBarWidth(42.5)).toBe('42.5%');
    expect(utilisationBarWidth(130)).toBe('100%');
    expect(utilisationBarWidth(-5)).toBe('0%');
    expect(utilisationBarWidth(null)).toBe('0%');
    expect(utilisationBarWidth(Number.NaN)).toBe('0%');
  });
});

describe('formatUtilisation', () => {
  it('shows one decimal, and a dash when the server has none (no limit)', () => {
    expect(formatUtilisation(46)).toBe('46.0%');
    expect(formatUtilisation(12.34)).toBe('12.3%');
    expect(formatUtilisation(0)).toBe('0.0%');
    expect(formatUtilisation(null)).toBe('—');
    expect(formatUtilisation(undefined)).toBe('—');
    expect(formatUtilisation(Number.NaN)).toBe('—');
  });
});
