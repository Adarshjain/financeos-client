import { describe, expect, it } from 'vitest';

import type { RewardCapBucket, RewardReport, RewardRule } from '@/lib/rewards.types';
import { pinClock } from '@/test/pinClock';

import { appliesTo, buildUsage, capWords, isEnded, ruleSubtitle } from './rulesPageModel';

pinClock();

const rule = (over: Partial<RewardRule> = {}): RewardRule =>
  ({
    id: 'r1',
    accountId: 'a1',
    name: '5X',
    priority: 2,
    stacking: 'EXCLUSIVE',
    accrualType: 'SLAB',
    rewardType: 'POINTS',
    slabSize: 150,
    pointsPerSlab: 20,
    mccs: ['5812', '5814', '5411'],
    categories: [],
    emiTreatment: 'INCLUDE',
    intlTreatment: 'INCLUDE',
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as RewardRule;

const cap = (over: Partial<RewardCapBucket> = {}): RewardCapBucket => ({
  id: 'c1',
  accountId: 'a1',
  name: 'Dining cap',
  cap: 5000,
  rewardType: 'POINTS',
  windowType: 'CALENDAR_MONTH',
  counterScope: 'ACCOUNT',
  ruleCount: 1,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const report = (over: Partial<RewardReport> = {}): RewardReport =>
  ({
    summary: {},
    rules: [
      {
        ruleId: 'r1',
        name: '5X',
        earned: 0,
        earnedUnit: 'POINTS',
        capStatus: { window: 'CALENDAR_MONTH', cap: 5000, used: 1250, windowStart: '2026-10-01', windowEnd: '2026-11-01', cycleFallback: false, sharedBucket: 'Dining cap' },
      },
      { ruleId: 'r2', name: 'Base', earned: 2180, earnedUnit: 'POINTS' },
    ],
    milestones: [
      { milestoneId: 'm1', name: 'Spend', windowType: 'ANNIVERSARY_YEAR', windowStart: '2026-03-15', windowEnd: '2027-03-14', basis: 'SPEND', threshold: 400000, progress: 84000, achieved: false },
      { milestoneId: 'm2', name: 'Done', windowType: 'QUARTER', windowStart: '2026-07-01', windowEnd: '2026-09-30', basis: 'SPEND', threshold: 1000, progress: 1500, achieved: true },
    ],
    cycleFallback: false,
    anniversaryFallback: false,
    ...over,
  }) as unknown as RewardReport;

describe('buildUsage', () => {
  const usage = buildUsage(report(), [rule(), rule({ id: 'r2', capBucketId: null }), rule({ id: 'r3', rewardType: 'CASH' })], [cap()], '2026-10-24');

  it('says what each rule earned this year, and marks the ones that earned nothing', () => {
    expect(usage.earned.r1).toEqual({ text: '0 pts', zero: true });
    expect(usage.earned.r2).toEqual({ text: '2,180 pts', zero: false });
    expect(usage.earned.r3).toEqual({ text: '₹0', zero: true });
  });

  it('reads a shared cap’s use from a rule drawing on it', () => {
    const withBucket = buildUsage(report(), [rule({ capBucketId: 'c1' })], [cap()], '2026-10-24');
    expect(withBucket.caps.c1).toEqual({ pct: 25, tone: 'brand', label: '1,250 / 5,000 · resets 1 Nov' });
  });

  it('shows an unused cap as empty without a reset date', () => {
    expect(usage.caps.c1.label).toBe('0 / 5,000');
    expect(usage.caps.c1.pct).toBe(0);
  });

  it('turns amber near the cap and red at it', () => {
    const full = report();
    full.rules[0].capStatus!.used = 5000;
    expect(buildUsage(full, [rule({ capBucketId: 'c1' })], [cap()], '2026-10-24').caps.c1.tone).toBe('danger');
    full.rules[0].capStatus!.used = 4200;
    expect(buildUsage(full, [rule({ capBucketId: 'c1' })], [cap()], '2026-10-24').caps.c1.tone).toBe('warning');
  });

  it('gives a milestone its percent and days left, or "achieved"', () => {
    expect(usage.milestones.m1.label).toBe('21% · 141 d left');
    expect(usage.milestones.m1.range).toBe('15 Mar → 14 Mar 2027');
    expect(usage.milestones.m2.label).toBe('100% · achieved');
  });
});

describe('rule row words', () => {
  it('counts MCCs past two, names categories and falls back to everything else', () => {
    expect(appliesTo(rule())).toBe('3 MCCs');
    expect(appliesTo(rule({ mccs: ['5812', '5814'] }))).toBe('MCC 5812 5814');
    expect(appliesTo(rule({ mccs: [], categories: [{ id: 'k', name: 'Dining' } as never] }))).toBe('Dining');
    expect(appliesTo(rule({ mccs: [], merchantPattern: 'swiggy', emiTreatment: 'EXCLUDE_EMI' }))).toBe('"swiggy" · no EMI');
    expect(appliesTo(rule({ mccs: [] }))).toBe('everything else');
    expect(appliesTo(rule({ mccs: [], intlTreatment: 'EXCLUDE_INTL' }))).toBe('no international');
    expect(appliesTo(rule({ mccs: [], intlTreatment: 'ONLY_INTL' }))).toBe('international only');
  });

  it('words an own cap and a shared cap', () => {
    expect(capWords(rule({ periodCap: 5000, capWindow: 'CALENDAR_MONTH' }))).toBe('capped 5,000 / month');
    expect(capWords(rule({ capBucketId: 'c1', capBucketName: 'Dining cap' }))).toBe('shared cap “Dining cap”');
    expect(capWords(rule())).toBeNull();
  });

  it('writes earns, applies to and cap; stacking, dates and earnings stay off the second line', () => {
    expect(ruleSubtitle(rule({ periodCap: 5000, capWindow: 'CALENDAR_MONTH', activeFrom: '2026-01-01' }))).toBe(
      '20 pts / ₹150 · 3 MCCs · capped 5,000 / month',
    );
    expect(ruleSubtitle(rule({ stacking: 'ADDITIVE', perTxnCap: 100 }))).toBe('20 pts / ₹150 · 3 MCCs · max 100 / transaction');
  });

  it('marks an ended rule: the end day itself is outside it', () => {
    expect(isEnded(rule({ activeTo: '2026-10-24' }), '2026-10-24')).toBe(true);
    expect(isEnded(rule({ activeTo: '2026-10-25' }), '2026-10-24')).toBe(false);
    expect(isEnded(rule(), '2026-10-24')).toBe(false);
  });
});
