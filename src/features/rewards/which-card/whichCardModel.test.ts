import { describe, expect, it } from 'vitest';

import type { RewardCardRecommendation, SimulatedMilestone, SimulatedRuleLine } from '@/lib/rewards.types';

import {
  AMOUNT_ERROR,
  ANY,
  assumptions,
  breakdown,
  buildRequest,
  cardNotes,
  cardRow,
  initialForm,
  resultTitle,
} from './whichCardModel';

const card = (over: Partial<RewardCardRecommendation> = {}): RewardCardRecommendation => ({
  accountId: 'a',
  accountName: 'HDFC Regalia',
  rank: 1,
  totalValueInr: 300,
  guaranteedValueInr: 300,
  milestoneValueInr: 0,
  effectiveRatePct: 6.667,
  pointValueSource: 'CONFIG',
  pointValueInr: 0.5,
  pointsValued: true,
  ruleLines: [],
  milestones: [],
  noRulesConfigured: false,
  cycleFallback: false,
  anniversaryFallback: false,
  ...over,
});

describe('buildRequest', () => {
  const base = initialForm('2026-10-13');

  it('sends the defaults as the Legacy simulator did: amount, date, flags, nothing else', () => {
    expect(buildRequest(base)).toEqual({
      ok: true,
      request: {
        amount: 5000,
        date: '2026-10-13',
        categoryIds: undefined,
        mcc: undefined,
        merchantText: undefined,
        channel: undefined,
        isEmi: false,
        isIntl: false,
        accountIds: undefined,
      },
    });
  });

  it('merges the one category with the more categories, once each, and trims the text fields', () => {
    const r = buildRequest({
      ...base,
      amount: '120+80',
      categoryId: 'c1',
      moreCategoryIds: ['c2', 'c1'],
      channel: 'POS',
      merchantText: '  Swiggy ',
      mcc: ' 5812 ',
      isEmi: true,
      isIntl: true,
      accountIds: ['a', 'b'],
    });
    expect(r).toMatchObject({
      ok: true,
      request: {
        amount: 200,
        categoryIds: ['c1', 'c2'],
        channel: 'POS',
        merchantText: 'Swiggy',
        mcc: '5812',
        isEmi: true,
        isIntl: true,
        accountIds: ['a', 'b'],
      },
    });
  });

  it('uses the more categories alone when the one category is any', () => {
    const r = buildRequest({ ...base, categoryId: ANY, moreCategoryIds: ['c2'] });
    expect(r).toMatchObject({ ok: true, request: { categoryIds: ['c2'] } });
  });

  it.each(['', '0', '-5', '5+', 'abc'])('rejects the amount %j with the Legacy message', (amount) => {
    expect(buildRequest({ ...base, amount })).toEqual({ ok: false, error: AMOUNT_ERROR });
  });
});

describe('resultTitle', () => {
  const categories = [{ id: 'c1', name: 'Dining' }, { id: 'c2', name: 'Fuel' }];
  it('names the spend, its categories and today', () => {
    expect(resultTitle({ amount: 4500, categoryIds: ['c1'], date: '2026-10-13' }, categories, '2026-10-13')).toBe(
      'Ranked for ₹4,500 dining today'
    );
  });
  it('names another day and several categories, and keeps paise', () => {
    expect(resultTitle({ amount: 99.5, categoryIds: ['c1', 'c2'], date: '2026-10-01' }, categories, '2026-10-13')).toBe(
      'Ranked for ₹99.50 dining, fuel on 1 Oct'
    );
  });
  it('has no category words without categories', () => {
    expect(resultTitle({ amount: 100 }, categories, '2026-10-13')).toBe('Ranked for ₹100 today');
  });
});

describe('cardRow and cardNotes', () => {
  it('marks the first card best and shows guaranteed, milestone and effective return', () => {
    expect(cardRow(card({ milestoneValueInr: 250, totalValueInr: 550 }))).toMatchObject({
      best: true,
      earn: '₹550',
      effective: '6.7% effective return',
      detail: 'Guaranteed ₹300 + milestone ₹250',
    });
    expect(cardRow(card({ rank: 2 })).best).toBe(false);
  });
  it('notes an assumed point value only when points were valued with the default', () => {
    expect(cardNotes(card({ pointValueSource: 'DEFAULT', pointValueInr: 0.25 }))).toEqual([
      { tone: 'warning', text: 'Assumed ₹0.25/pt' },
    ]);
    expect(cardNotes(card({ pointValueSource: 'DEFAULT', pointsValued: false }))).toEqual([]);
    expect(cardNotes(card({ pointValueSource: 'CONFIG' }))).toEqual([]);
  });
  it('notes a bare card and the cycle fallback', () => {
    expect(cardNotes(card({ noRulesConfigured: true, cycleFallback: true })).map((n) => n.text)).toEqual([
      'Statement cycle fallback active',
      'No reward rules configured',
    ]);
  });
});

describe('assumptions', () => {
  it('lists the point value of each card whose points were valued, and the MCC entered', () => {
    const result = {
      input: { amount: 1, mcc: ' 5812 ' },
      recommendations: [
        card({ accountName: 'Regalia', pointValueInr: 0.5 }),
        card({ accountId: 'b', accountName: 'Amex', pointValueInr: 0.25, pointValueSource: 'DEFAULT' }),
        card({ accountId: 'c', accountName: 'SBI', pointsValued: false, pointValueInr: 0.25 }),
      ],
    };
    expect(assumptions(result)).toEqual({ pointValues: 'Regalia ₹0.50 · Amex ₹0.25', mcc: '5812' });
  });
  it('has neither when nothing was valued or entered', () => {
    expect(assumptions({ input: { amount: 1 }, recommendations: [card({ pointsValued: false })] })).toEqual({
      pointValues: null,
      mcc: null,
    });
  });
});

describe('breakdown', () => {
  const line = (over: Partial<SimulatedRuleLine>): SimulatedRuleLine => ({
    ruleId: 'r1',
    ruleName: '5X dining',
    stacking: 'EXCLUSIVE',
    earned: 600,
    earnedUnit: 'POINTS',
    earnedValueInr: 300,
    reason: 'PARTIAL_CAP',
    capStatus: { capWindow: 'CALENDAR_MONTH', totalCap: 5000, usedBefore: 0, capRemainingBefore: 5000, bucketName: 'Shared', windowEnd: '2026-10-31' },
    ...over,
  });
  const milestone = (over: Partial<SimulatedMilestone>): SimulatedMilestone => ({
    milestoneId: 'm1',
    name: 'Annual 4L',
    windowEnd: '2027-03-31',
    progress: 100000,
    threshold: 400000,
    remainingToThreshold: 300000,
    crosses: false,
    scoredValueInr: 250,
    payoutType: 'CASH_VALUE',
    ...over,
  });

  it('shows each rule outcome, the points and their value, and the cap headroom', () => {
    const b = breakdown(card({ ruleLines: [line({})] }));
    expect(b.lines[0]).toMatchObject({
      name: '5X dining',
      stacking: 'EXCLUSIVE',
      outcome: { label: 'Cap clamped', tone: 'warning' },
      earned: '600 pts',
      earnedValue: '= ₹300',
      cap: { text: 'Cap headroom ₹5,000 of ₹5,000 (shared: Shared) · window ends 31 Oct', remaining: 5000, total: 5000 },
    });
  });
  it('names a base evaluation and leaves rupees plain without a cap', () => {
    const b = breakdown(card({ ruleLines: [line({ ruleName: null, earnedUnit: 'RUPEES', earned: 45, capStatus: null, reason: 'MATCHED' })] }));
    expect(b.lines[0]).toMatchObject({ name: 'Base rule evaluation', earned: '₹45', earnedValue: null, cap: null, outcome: { tone: 'success' } });
  });
  it('shows milestone progress and whether the spend crosses the threshold', () => {
    const b = breakdown(card({ milestones: [milestone({}), milestone({ milestoneId: 'm2', crosses: true })] }));
    expect(b.milestones[0]).toMatchObject({
      progress: 'Progress ₹1,00,000 / ₹4,00,000',
      status: '₹3,00,000 to go · valued at ₹250',
      value: '+₹250',
      crosses: false,
    });
    expect(b.milestones[1]).toMatchObject({ status: 'Crosses the threshold on this spend', crosses: true });
  });
  it('totals guaranteed, milestone and effective return', () => {
    expect(breakdown(card({ milestoneValueInr: 250, totalValueInr: 550 })).summary).toEqual([
      { label: 'Guaranteed', value: '₹300' },
      { label: 'Milestone', value: '₹250' },
      { label: 'Total', value: '₹550' },
      { label: 'Effective return', value: '6.7%' },
    ]);
  });
});
