import { describe, expect, it } from 'vitest';

import type { MilestoneStatus, RewardLine, RewardReport, RewardRule } from '@/lib/rewards.types';

import {
  buildKpis,
  buildMilestone,
  cardholderRows,
  completedMilestones,
  lineDetail,
  linesSubtitle,
  milestonePaid,
  parseRewardsQuery,
  rewardsBanners,
  rewardsHref,
  ruleExtras,
  windowLabel,
} from './rewardsModel';

const window = { from: '2026-03-15', to: '2027-03-14', calendarYear: false };

const report: RewardReport = {
  summary: {
    basisSpend: 1000,
    transactionCount: 4,
    matchedCount: 4,
    cashbackInr: 0,
    points: 400,
    milestonesInr: 0,
    milestonesPts: 0,
    grossValueInr: 0,
    discounts: 0,
    fees: 0,
    effectiveValueInr: 0,
    pointsValueInr: null,
  },
  rules: [],
  milestones: [],
  cycleFallback: false,
  anniversaryFallback: false,
};

describe('period in the address', () => {
  it('reads a preset, and leaves the default out', () => {
    expect(parseRewardsQuery({ period: 'LAST_MONTH' }, [])).toMatchObject({ period: 'LAST_MONTH' });
    expect(parseRewardsQuery({ period: 'THIS_ANNIVERSARY_YEAR' }, []).period).toBeUndefined();
    expect(parseRewardsQuery({ period: 'nope' }, []).period).toBeUndefined();
  });
  it('reads from and to only for a custom period, and only real dates', () => {
    expect(parseRewardsQuery({ period: 'CUSTOM', from: '2026-05-01', to: '2026-06-30' }, [])).toMatchObject({
      period: 'CUSTOM',
      from: '2026-05-01',
      to: '2026-06-30',
    });
    expect(parseRewardsQuery({ period: 'CUSTOM', from: '2026-02-31', to: 'x' }, [])).toMatchObject({ from: undefined, to: undefined });
    expect(parseRewardsQuery({ period: 'THIS_MONTH', from: '2026-05-01' }, []).from).toBeUndefined();
  });
  it('writes the period, the custom dates and a reset page', () => {
    const base = '/ds/rewards/cards/c1';
    expect(rewardsHref(base, { period: 'LAST_MONTH', page: 0, size: 25 })).toBe(`${base}?period=LAST_MONTH`);
    expect(rewardsHref(base, { period: 'CUSTOM', from: '2026-05-01', to: '2026-06-30', page: 2, size: 25 })).toBe(
      `${base}?period=CUSTOM&from=2026-05-01&to=2026-06-30&page=3`,
    );
    expect(rewardsHref(base, { period: 'THIS_ANNIVERSARY_YEAR', page: 0, size: 25 })).toBe(base);
  });
  it('words the period in the tile and the lines subtitle', () => {
    expect(windowLabel(window)).toBe('anniversary year 15 Mar → 14 Mar');
    expect(windowLabel({ from: '2026-10-01', to: '2026-10-13', calendarYear: false }, 'THIS_MONTH')).toBe('this month 1 Oct → 13 Oct');
    expect(linesSubtitle(3, window, 'LAST_3_MONTHS')).toBe('3 lines · last 3 months');
    expect(linesSubtitle(3, window, 'LAST_ANNIVERSARY_YEAR')).toBe('3 lines · previous anniversary year');
  });
});

describe('points with no point value', () => {
  const gross = (summary: object) => buildKpis({ ...report, summary: { ...report.summary, ...summary } }, window)[1];
  it('shows rupees plus points and asks for the point value', () => {
    expect(gross({ cashbackInr: 340, grossValueInr: 340 })).toMatchObject({ value: '₹340 + 400 pts', needsPointValue: true });
  });
  it('shows plain points when there are no rupees', () => {
    expect(gross({})).toMatchObject({ value: '400 pts', needsPointValue: true });
  });
  it('does not ask once the points are valued', () => {
    expect(gross({ pointsValueInr: 100, grossValueInr: 100 }).needsPointValue).toBeUndefined();
  });
});

describe('lineDetail', () => {
  const line: RewardLine = {
    transactionId: 't1',
    transactionDate: '2026-10-02',
    effectiveDate: '2026-10-03',
    description: 'Uber',
    sourcedDescription: 'UBER INDIA 4455',
    mcc: '4121',
    channel: 'ONLINE',
    amount: 400,
    basis: 352,
    ruleId: 'r2',
    ruleName: 'Base',
    earned: 8,
    earnedUnit: 'POINTS',
    reason: 'PARTIAL_CAP',
  };
  it('lists the dates, amounts, MCC, channel, rule and earned', () => {
    const d = lineDetail(line);
    expect(d.title).toBe('Uber');
    expect(d.source).toBe('UBER INDIA 4455');
    expect(d.rows).toEqual([
      { label: 'Transaction date', value: '2 Oct 2026' },
      { label: 'Settled (used for rewards)', value: '3 Oct 2026' },
      { label: 'Amount charged', value: '₹400' },
      { label: 'Eligible after refunds', value: '₹352' },
      { label: 'MCC', value: '4121' },
      { label: 'Channel', value: 'ONLINE' },
      { label: 'Rule', value: 'Base' },
      { label: 'Earned', value: '8 pts' },
    ]);
    expect(d.reason).toMatchObject({ label: 'Cap clamped', tone: 'warning' });
    expect(d.reason.explain).toBe('Earned, but clamped by a per-transaction or period cap.');
  });
  it('leaves out what is the same or missing', () => {
    const d = lineDetail({ ...line, effectiveDate: line.transactionDate, basis: 400, mcc: null, channel: null, sourcedDescription: 'Uber', ruleName: null, earned: 0 });
    expect(d.source).toBeNull();
    expect(d.rows.map((r) => r.label)).toEqual(['Transaction date', 'Amount charged', 'Rule', 'Earned']);
    expect(d.rows.at(-1)).toEqual({ label: 'Earned', value: '—' });
    expect(d.rows.at(-2)).toEqual({ label: 'Rule', value: '—' });
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
    progress: 400000,
    achieved: true,
    payoutType: 'CASH_VALUE',
    rewardType: 'CASH',
    payoutValue: 2500,
    payoutDate: '2026-09-30',
    countedInSummary: true,
  };
  it('sums what finished milestones paid, per currency, ignoring trackers', () => {
    expect(milestonePaid([m, { ...m, milestoneId: 'm2', rewardType: 'POINTS', payoutValue: 5000 }, { ...m, milestoneId: 'm3', payoutType: 'INFO_TRACKER', payoutValue: null }])).toBe('₹2,500 + 5,000 pts');
    expect(milestonePaid([{ ...m, payoutType: 'INFO_TRACKER', payoutValue: null }])).toBeNull();
  });
  it('lists the completed ones, latest credit first, each with its credited day', () => {
    const earlier = { ...m, milestoneId: 'm2', name: 'Fee waiver', payoutType: 'INFO_TRACKER' as const, payoutValue: null, payoutDate: '2026-05-02', windowType: 'ONE_TIME' as const, windowStart: '2026-03-01', windowEnd: '2026-05-01' };
    const c = completedMilestones([earlier, m, { ...m, milestoneId: 'm9', achieved: false }])!;
    expect(c.count).toBe(2);
    expect(c.paid).toBe('₹2,500');
    expect(c.rows.map((r) => r.title)).toEqual(['Annual spend', 'Fee waiver']);
    expect(c.rows[0]).toMatchObject({ subtitle: '15 Mar → 14 Mar · credited 30 Sep', payout: '₹2,500' });
    expect(c.rows[1]).toMatchObject({ subtitle: 'One-time · 1 Mar → 1 May · credited 2 May', payout: 'Tracker' });
  });
  it('has no completed list when none finished', () => {
    expect(completedMilestones([{ ...m, achieved: false }])).toBeNull();
  });
  it('shows a one-time offer with its dates', () => {
    const open = buildMilestone({ ...m, achieved: false, progress: 100, windowType: 'ONE_TIME', windowStart: '2026-10-01', windowEnd: '2026-12-31', basis: 'TXN_COUNT', threshold: 4, minTxnAmount: 1500 }, '2026-10-13');
    expect(open.caption).toContain('one-time 1 Oct → 31 Dec');
    expect(open.figure.of).toBe('of 4 transactions');
    expect(open.subtitle).toBe('4 transactions of ₹1,500+ each in the period → ₹2,500 bonus');
  });
});

describe('rule extras', () => {
  const rule = { id: 'r1', name: '5X', priority: 1 } as RewardRule;
  const breakdown = (over: object) => ({
    ruleId: 'r1',
    name: '5X',
    stacking: 'EXCLUSIVE' as const,
    accrualType: 'SLAB' as const,
    activeInRange: true,
    matchedCount: 2,
    basisMatched: 10,
    earned: 50,
    earnedUnit: 'POINTS',
    ...over,
  });
  const capStatus = (over: object) => ({ window: 'CALENDAR_MONTH' as const, cap: 100, used: 50, windowStart: '2026-10-01', windowEnd: '2026-10-31', cycleFallback: false, ...over });
  const extras = (b: object) => ruleExtras('r1', [rule], { ...report, rules: [b as never] });

  it('draws the cap with used of cap and its reset day', () => {
    expect(extras(breakdown({ capStatus: capStatus({}) })).bars).toEqual([{ key: 'cap', label: '50 of 100 pts · resets 31 Oct', pct: 50, tone: 'brand' }]);
  });
  it('turns amber from 80% and red once the cap is hit', () => {
    expect(extras(breakdown({ capStatus: capStatus({ used: 80 }) })).bars[0]).toMatchObject({ pct: 80, tone: 'warning' });
    expect(extras(breakdown({ capStatus: capStatus({ used: 100 }) })).bars[0]).toMatchObject({ pct: 100, tone: 'danger' });
    expect(extras(breakdown({ capStatus: capStatus({ used: 130 }) })).bars[0]).toMatchObject({ pct: 100, tone: 'danger' });
  });
  it('shows rupees for a cash rule, and names a shared cap and the month fallback', () => {
    const e = extras(breakdown({ earnedUnit: 'RUPEES', capStatus: capStatus({ cap: 5000, used: 3200, sharedBucket: 'Dining', cycleFallback: true }) }));
    expect(e.bars[0].label).toBe('Shared "Dining" ₹3,200 of ₹5,000 (month fallback) · resets 31 Oct');
  });
  it('draws one bar per cardholder when the cap counts per cardholder', () => {
    const e = extras(
      breakdown({
        capStatus: capStatus({
          counterScope: 'PER_CARDHOLDER',
          perCard: [
            { cardId: 'a', cardLabel: 'Arjun', used: 20 },
            { cardId: null, cardLabel: 'Unattributed', used: 90 },
          ],
        }),
      }),
    );
    expect(e.bars.map((b) => [b.key, b.label, b.tone])).toEqual([
      ['a', 'Arjun: 20 of 100 pts · resets 31 Oct', 'brand'],
      ['unattributed', 'Unattributed: 90 of 100 pts · resets 31 Oct', 'warning'],
    ]);
  });
  it('has no bar without a cap or a used figure', () => {
    expect(extras(breakdown({})).bars).toEqual([]);
    expect(extras(breakdown({ capStatus: capStatus({ used: null }) })).bars).toEqual([]);
  });
  it('says plainly when a rule earned nothing in the period, and not otherwise', () => {
    expect(extras(breakdown({ earned: 0 })).note).toBe('5X earned nothing this period');
    expect(ruleExtras('r1', [rule], report).note).toBe('5X earned nothing this period');
    expect(extras(breakdown({})).note).toBeNull();
  });
});

describe('banners and cardholders', () => {
  it('words each amber note, with Manage cards on the unattributed one', () => {
    expect(rewardsBanners(report)).toEqual([]);
    const b = rewardsBanners({ ...report, cycleFallback: true, anniversaryFallback: true, perCardAttributionIncomplete: 1 });
    expect(b.map((x) => x.key)).toEqual(['cycle', 'anniversary', 'unattributed']);
    expect(b[0].text).toBe('Some statement-cycle caps fell back to calendar months — add statements for this account to get exact cycle windows.');
    expect(b[1].text).toContain('fell back to calendar years');
    expect(b[2]).toMatchObject({ text: '1 transaction on this multi-card account is unattributed and could not match card-scoped rules or limits.', action: { label: 'Manage cards' } });
    expect(rewardsBanners({ ...report, perCardAttributionIncomplete: 3 })[0].text).toContain('3 transactions on this multi-card account are unattributed');
  });
  it('splits by cardholder only with two or more, and names the transactions with no card Unattributed', () => {
    expect(cardholderRows(report)).toEqual([]);
    const one = { cardId: 'a', cardLabel: 'Arjun', unattributed: false, basisSpend: 100, cashbackInr: 0, points: 888, txnCount: 19 };
    expect(cardholderRows({ ...report, byCard: [one] })).toEqual([]);
    const rows = cardholderRows({
      ...report,
      byCard: [one, { cardId: null, cardLabel: 'No card', unattributed: true, basisSpend: 50, cashbackInr: 12, points: 0, txnCount: 1 }],
    });
    expect(rows).toEqual([
      { id: 'a', title: 'Arjun', subtitle: '19 transactions · ₹100 spend', earned: '888 pts' },
      { id: 'unattributed', title: 'Unattributed', subtitle: '1 transaction · ₹50 spend', earned: '₹12' },
    ]);
  });
});
