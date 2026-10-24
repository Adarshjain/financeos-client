import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { MilestoneStatus, RewardLine, RewardReport, RewardRule } from '@/lib/rewards.types';

import {
  buildKpis,
  buildMilestone,
  clampedPage,
  lineRow,
  linesSubtitle,
  milestonePace,
  parseRewardsQuery,
  rewardsHref,
  ruleChips,
  ruleDescription,
  ruleLines,
  windowLabel,
} from './rewardsModel';
import { capitalize } from './rewardsPeriod';

// Ranges drop the year of the current one, so the clock is fixed.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-13T06:00:00Z'));
});
afterAll(() => vi.useRealTimers());

const window = { from: '2026-03-15', to: '2027-03-14', calendarYear: false };

const report: RewardReport = {
  summary: {
    basisSpend: 83764,
    transactionCount: 30,
    matchedCount: 30,
    cashbackInr: 0,
    points: 2180,
    milestonesInr: 0,
    milestonesPts: 0,
    grossValueInr: 1090,
    discounts: 0,
    fees: 0,
    effectiveValueInr: 1090,
    effectivePct: 1.3,
    pointsValueInr: 1090,
  },
  rules: [
    { ruleId: 'r1', name: '5X', stacking: 'EXCLUSIVE', accrualType: 'SLAB', activeInRange: true, matchedCount: 0, basisMatched: 0, earned: 0, earnedUnit: 'POINTS' },
    { ruleId: 'r2', name: 'Base', stacking: 'EXCLUSIVE', accrualType: 'SLAB', activeInRange: true, matchedCount: 30, basisMatched: 83764, earned: 2180, earnedUnit: 'POINTS' },
  ],
  milestones: [],
  cycleFallback: false,
  anniversaryFallback: false,
};

const baseRule = {
  accountId: 'a',
  stacking: 'EXCLUSIVE',
  accrualType: 'SLAB',
  rewardType: 'POINTS',
  createdAt: '',
  updatedAt: '',
} as const;
const rule1: RewardRule = { ...baseRule, id: 'r1', name: '5X on dining', priority: 20, mccs: ['5812', '5814'], slabSize: 150, pointsPerSlab: 20, periodCap: 5000, capWindow: 'CALENDAR_MONTH' };
const rule2: RewardRule = { ...baseRule, id: 'r2', name: 'Base', priority: 10, slabSize: 150, pointsPerSlab: 4 };

describe('buildKpis', () => {
  it('builds the four tiles from the report', () => {
    const [eligible, gross, adjustments, effective] = buildKpis(report, window);
    expect(eligible).toMatchObject({ value: '₹83,764', context: '30 of 30 transactions earned' });
    expect(gross).toMatchObject({ value: '2,180 pts', context: '≈ ₹1,090 at ₹0.50 / pt' });
    expect(adjustments).toMatchObject({ value: '₹0', context: 'no fees netted' });
    expect(effective).toMatchObject({ value: '1.3%', context: 'Anniversary year 15 Mar 26 – 14 Mar 27' });
  });
  it('names the calendar year when there is no anniversary', () => {
    const k = buildKpis(report, { from: '2026-01-01', to: '2026-12-31', calendarYear: true });
    expect(k[3].context).toBe('Calendar year 1 Jan – 31 Dec');
  });
  it('nets discounts against fees and lists both', () => {
    const k = buildKpis({ ...report, summary: { ...report.summary, fees: 590, discounts: 100 } }, window);
    expect(k[2]).toMatchObject({ value: '-₹490', context: '₹590 fees · ₹100 discounts' });
  });
  it('leaves out effective return when the report has none, and shows cashback for cashback cards', () => {
    const k = buildKpis({ ...report, summary: { ...report.summary, points: 0, pointsValueInr: null, cashbackInr: 340, grossValueInr: 340, effectivePct: null } }, window);
    expect(k.map((t) => t.key)).toEqual(['eligible', 'gross', 'adjustments']);
    expect(k[1]).toMatchObject({ value: '₹340', context: undefined });
  });
});

describe('gross rewards with cash milestones', () => {
  const gross = (over: object) => buildKpis({ ...report, summary: { ...report.summary, ...over } }, window)[1];
  it('adds cash milestones to the points context', () => {
    expect(gross({ milestonesInr: 500, grossValueInr: 1590 })).toMatchObject({ value: '2,180 pts', context: '≈ ₹1,590 at ₹0.50 / pt · ₹500 milestones' });
  });
  it('shows rupees for cashback plus a cash milestone', () => {
    expect(gross({ points: 0, pointsValueInr: null, cashbackInr: 340, milestonesInr: 500, grossValueInr: 840 })).toMatchObject({
      value: '₹840',
      context: '₹340 cashback · ₹500 milestones',
    });
  });
  it('shows a milestone-only card in rupees, never 0 pts', () => {
    expect(gross({ points: 0, pointsValueInr: null, cashbackInr: 0, milestonesInr: 500, grossValueInr: 500 })).toMatchObject({
      value: '₹500',
      context: '₹500 milestones',
    });
  });
});

describe('clampedPage', () => {
  it('is null while the page exists or there are no rows', () => {
    expect(clampedPage(1, 25, 30)).toBeNull();
    expect(clampedPage(5, 25, 0)).toBeNull();
  });
  it('points at the last page when past the end', () => {
    expect(clampedPage(4, 25, 30)).toBe(1);
    expect(clampedPage(2, 25, 50)).toBe(1);
  });
});

describe('window words', () => {
  it('capitalises a word that is a label or starts a segment, and leaves mid-phrase ones lower case', () => {
    expect(capitalize('this anniversary year')).toBe('This anniversary year');
    expect(windowLabel({ from: '2026-03-15', to: '2027-03-14', calendarYear: true })).toMatch(/^Calendar year /);
    expect(windowLabel({ from: '2026-09-01', to: '2026-09-30', calendarYear: false }, 'LAST_MONTH')).toBe('Last month 1–30 Sep');
    const cycle = { milestoneId: 'm', name: 'Spend', windowType: 'STATEMENT_CYCLE', windowStart: '2026-10-01', windowEnd: '2026-10-31', basis: 'SPEND', threshold: 1000, progress: 0, achieved: false, payoutType: 'CASH_VALUE', rewardType: 'CASH', countedInSummary: false } as MilestoneStatus;
    expect(buildMilestone(cycle, '2026-10-13').subtitle).toBe('Spend ₹1,000 in the statement cycle');
  });
});

describe('parseRewardsQuery / rewardsHref', () => {
  it('reads rule, 1-based page and size', () => {
    expect(parseRewardsQuery({ rule: 'r2', page: '3', size: '50' }, ['r1', 'r2'])).toEqual({ ruleId: 'r2', page: 2, size: 50 });
  });
  it('ignores unknown rules and invalid page or size', () => {
    expect(parseRewardsQuery({ rule: 'nope', page: '0', size: '7' }, ['r1'])).toEqual({ ruleId: undefined, page: 0, size: 10 });
    expect(parseRewardsQuery(undefined, [])).toEqual({ ruleId: undefined, page: 0, size: 10 });
  });
  it('writes only non-default params', () => {
    const base = '/ds/accounts/c1/rewards';
    expect(rewardsHref(base, { page: 0, size: 10 })).toBe(base);
    expect(rewardsHref(base, { ruleId: 'r1', page: 1, size: 50 })).toBe(`${base}?rule=r1&page=2&size=50`);
  });
});

describe('lineRow', () => {
  const line: RewardLine = {
    transactionId: 't1',
    transactionDate: '2026-10-02',
    effectiveDate: '2026-10-03',
    description: 'Uber',
    amount: 352,
    basis: 352,
    ruleId: 'r2',
    ruleName: 'Base',
    earned: 8,
    earnedUnit: 'POINTS',
    reason: 'MATCHED',
    cardLabel: 'Meera',
  };
  it('formats a line', () => {
    expect(lineRow(line)).toMatchObject({ date: '3 Oct', description: 'Uber', holder: 'Meera', basis: '352', rule: 'Base', earned: '8 pts', why: { label: 'Earned', tone: 'success' } });
  });
  it('shows rupees for cashback and a plain word for a missing rule', () => {
    const r = lineRow({ ...line, earnedUnit: 'RUPEES', earned: 12, ruleName: null, reason: 'NO_RULE', cardLabel: null });
    expect(r).toMatchObject({ earned: '₹12', rule: 'No rule', holder: null, why: { label: 'No rule', tone: 'neutral' } });
  });
  it('pluralises the subtitle', () => {
    expect(linesSubtitle(30, window)).toBe('30 lines · This anniversary year');
    expect(linesSubtitle(1, { ...window, calendarYear: true })).toBe('1 line · This calendar year');
  });
});

describe('milestones', () => {
  const m: MilestoneStatus = {
    milestoneId: 'm1',
    name: 'Annual spend',
    windowType: 'ANNIVERSARY_YEAR',
    windowStart: '2026-03-15',
    windowEnd: '2027-03-14',
    basis: 'SPEND',
    threshold: 400000,
    progress: 83764,
    achieved: false,
    payoutType: 'CASH_VALUE',
    rewardType: 'POINTS',
    payoutValue: 10000,
    countedInSummary: false,
  };
  const today = '2026-10-13';

  it('computes days left, the need and the pace per day', () => {
    const p = milestonePace(m, today)!;
    expect(p.daysLeft).toBe(152);
    expect(Math.round(p.needPerDay)).toBe(2081);
    expect(p.pacePerDay).toBeCloseTo(83764 / 213, 5);
  });
  it('returns no pace outside the window', () => {
    expect(milestonePace(m, '2027-04-01')).toBeNull();
    expect(milestonePace(m, '2026-01-01')).toBeNull();
  });
  it('builds the card as on the board', () => {
    const model = buildMilestone(m, today);
    expect(model.subtitle).toBe('Spend ₹4L in the year → 10,000 bonus pts');
    expect(model.figure).toEqual({ done: '₹83,764', of: 'of ₹4,00,000' });
    expect(model.pct).toBe(21);
    expect(model.caption).toBe('21% · 152 days left · need ₹2,081 / day · pace ₹393 / day');
    expect(model.status?.label).toBe('Behind');
  });
  it('is on track when the pace covers the need, achieved when achieved', () => {
    expect(buildMilestone({ ...m, progress: 300000 }, today).status?.label).toBe('On track');
    const done = buildMilestone({ ...m, progress: 400000, achieved: true }, today);
    expect(done.status).toEqual({ label: 'Achieved', tone: 'success' });
    expect(done.caption).toBe('100%');
  });
  it('titles the card with the milestone name', () => {
    expect(buildMilestone(m, today).title).toBe('Annual spend');
    expect(buildMilestone({ ...m, name: '' }, today).title).toBe('Milestone');
  });
  describe.each([
    {
      type: 'cash payout (rupees)',
      over: { rewardType: 'CASH', payoutValue: 2500 },
      subtitle: 'Spend ₹4L in the year → ₹2,500 bonus',
    },
    {
      type: 'points payout',
      over: { rewardType: 'POINTS', payoutValue: 10000 },
      subtitle: 'Spend ₹4L in the year → 10,000 bonus pts',
    },
    {
      type: 'info tracker (no payout)',
      over: { payoutType: 'INFO_TRACKER', payoutValue: null },
      subtitle: 'Spend ₹4L in the year',
    },
    {
      type: 'transaction count with a minimum amount',
      over: { basis: 'TXN_COUNT', threshold: 50, progress: 10, minTxnAmount: 500, payoutValue: null },
      subtitle: '50 transactions of ₹500+ each in the year',
    },
    {
      type: 'one-time window',
      over: { windowType: 'ONE_TIME', payoutValue: null },
      subtitle: 'Spend ₹4L in the period',
    },
    {
      type: 'statement cycle window',
      over: { windowType: 'STATEMENT_CYCLE', payoutValue: null },
      subtitle: 'Spend ₹4L in the statement cycle',
    },
  ] as const)('$type', ({ over, subtitle }) => {
    it('shows the milestone with its name and target', () => {
      const model = buildMilestone({ ...m, ...over } as MilestoneStatus, today);
      expect(model.title).toBe('Annual spend');
      expect(model.subtitle).toBe(subtitle);
    });
  });
  it('says when an achieved payout was credited', () => {
    const done = buildMilestone({ ...m, progress: 400000, achieved: true, payoutDate: '2026-09-30' }, today);
    expect(done.caption).toBe('100% · credited 30 Sep');
  });
  it('has no status or pace for a transaction-count milestone', () => {
    const c = buildMilestone({ ...m, basis: 'TXN_COUNT', threshold: 50, progress: 10, payoutValue: null }, today);
    expect(c.status).toBeNull();
    expect(c.figure.of).toBe('of 50 transactions');
    expect(c.caption).toBe('20% · 152 days left');
  });
});

describe('rules', () => {
  it('describes criteria, rate and cap, and marks the catch-all', () => {
    expect(ruleDescription(rule1)).toBe('MCC 5812 5814 · 20 pts / ₹150 · cap 5,000 / month');
    expect(ruleDescription(rule2)).toBe('4 pts / ₹150 · everything else');
    expect(ruleDescription({ ...baseRule, id: 'x', name: 'x', priority: 1, accrualType: 'PERCENT', percentRate: 5, merchantPattern: 'Swiggy' })).toBe('"Swiggy" · 5%');
  });
  it('lists rules by priority with earned points', () => {
    const lines = ruleLines([rule2, rule1], report);
    expect(lines.map((l) => l.title)).toEqual(['20 · 5X on dining', '10 · Base']);
    expect(lines.map((l) => l.earned)).toEqual(['0 pts', '2,180 pts']);
  });
  it('falls back to the report when the rule list failed', () => {
    expect(ruleLines(null, report)).toEqual([
      { id: 'r1', title: '5X', description: '', earned: '0 pts' },
      { id: 'r2', title: 'Base', description: '', earned: '2,180 pts' },
    ]);
    expect(ruleChips(null, report)).toEqual([{ id: 'r1', label: '5X' }, { id: 'r2', label: 'Base' }]);
    expect(ruleChips([rule2, rule1], report).map((c) => c.id)).toEqual(['r1', 'r2']);
  });
});
