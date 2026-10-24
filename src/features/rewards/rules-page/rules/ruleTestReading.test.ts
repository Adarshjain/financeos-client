import { describe, expect, it } from 'vitest';

import { readRuleTest } from './ruleTestReading';

const fields = (over: Partial<Parameters<typeof readRuleTest>[1]> = {}): Parameters<typeof readRuleTest>[1] => ({
  previewAmount: '2500',
  accrualType: 'PERCENT',
  percentRate: '5',
  slabSize: '',
  pointsPerSlab: '',
  isTiered: false,
  rewardType: 'CASH',
  ...over,
});

describe('readRuleTest', () => {
  it('reads a percent match as the cashback and "Matches · 5% of ₹2,500"', () => {
    expect(readRuleTest({ matched: true, text: 'Matches → ₹125.00 cashback' }, fields())).toEqual({
      headline: '₹125.00',
      verdict: 'Matches · 5% of ₹2,500',
      tone: 'positive',
    });
  });

  it('reads a slab match in points', () => {
    const f = fields({ accrualType: 'SLAB', rewardType: 'POINTS', slabSize: '150', pointsPerSlab: '20' });
    expect(readRuleTest({ matched: true, text: 'Matches → 320 pts' }, f)).toEqual({
      headline: '320 pts',
      verdict: 'Matches · 20 pts per ₹150 slab on ₹2,500',
      tone: 'positive',
    });
  });

  it('reads a cash slab in rupees per slab', () => {
    const f = fields({ accrualType: 'SLAB', slabSize: '100', pointsPerSlab: '2' });
    expect(readRuleTest({ matched: true, text: 'Matches → ₹50.00 cashback' }, f).verdict).toBe('Matches · ₹2 per ₹100 slab on ₹2,500');
  });

  it('keeps the tier assumption on a tiered match', () => {
    const r = readRuleTest({ matched: true, text: 'Matches → ₹90.00 cashback (tier progress assumed ₹0)' }, fields({ isTiered: true }));
    expect(r.headline).toBe('₹90.00');
    expect(r.verdict).toBe('Matches · Tiered rate on ₹2,500 · tier progress assumed ₹0');
  });

  it('reads a miss as zero earned in the reward unit, with the reason capitalised', () => {
    expect(readRuleTest({ matched: false, text: 'No match — EMI spends are excluded' }, fields())).toEqual({
      headline: '₹0',
      verdict: 'No match · EMI spends are excluded',
      tone: 'warning',
    });
    expect(readRuleTest({ matched: false, text: 'No match — channel not covered by this rule' }, fields({ rewardType: 'POINTS' })).headline).toBe('0 pts');
  });

  it('shows only the sentence when the preview cannot judge (regex)', () => {
    expect(readRuleTest({ matched: false, text: 'Can’t test this regex in the browser' }, fields())).toEqual({
      headline: null,
      verdict: 'Can’t test this regex in the browser',
      tone: 'warning',
    });
  });
});
