import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory } from '../fixtures/seed/categories';
import { runAdHoc } from '../fixtures/seed/reports';
import {
  createMilestone,
  createRewardCard,
  createRewardRule,
  fixedMonth,
  lines,
  report,
  setRewardConfig,
  spend,
} from '../fixtures/seed/rewards';
import { createTransaction } from '../fixtures/seed/transactions';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, freshUser, test } from '../fixtures/test';

type Filter = { field: string; operator: string; value?: unknown };

async function fieldValues(api: ApiClient, datasource: string): Promise<Record<string, string[]>> {
  const res = await api.GET('/api/v1/report/datasource/{name}/values', {
    params: { path: { name: datasource } },
  });
  expectStatus(res, 200);
  return res.data!.values;
}

async function kpi(
  api: ApiClient,
  datasource: string,
  measure: string,
  filters: Filter[],
  aggregation = 'sum',
): Promise<number> {
  const data = (await runAdHoc(api, {
    type: 'KPI',
    datasource,
    definition: { measure, aggregation, filters },
  } as never)) as unknown as { value: number | null };
  return Number(data.value ?? 0);
}

async function chart(
  api: ApiClient,
  datasource: string,
  dimension: string,
  measure: string,
  filters: Filter[],
): Promise<Record<string, number>> {
  const data = (await runAdHoc(api, {
    type: 'CHART',
    datasource,
    definition: {
      chartType: 'bar',
      dimension: { field: dimension },
      measure: { field: measure, aggregation: 'sum' },
      filters,
    },
  } as never)) as unknown as { categories: string[]; series: Array<{ data: Array<number | null> }> };
  const out: Record<string, number> = {};
  data.categories.forEach((c, i) => {
    out[c] = Number(data.series[0].data[i] ?? 0);
  });
  return out;
}

async function rawRows(
  api: ApiClient,
  datasource: string,
  columns: string[],
  filters: Filter[],
): Promise<Array<Record<string, unknown>>> {
  const data = (await runAdHoc(api, {
    type: 'TABLE',
    datasource,
    definition: { mode: 'raw', columns, filters },
  } as never)) as unknown as { rows: Array<Record<string, unknown>> };
  return data.rows;
}

function inMonth(month: { from: string; to: string }, field = 'effectiveDate'): Filter[] {
  return [{ field, operator: 'between', value: { from: month.from, to: month.to } }];
}

function day(month: { from: string }, d: number): string {
  return `${month.from.slice(0, 7)}-${String(d).padStart(2, '0')}`;
}

test.describe('Reward reports API (@api)', () => {
  test('field values: every dynamic reward field comes from the user data, card-less transactions read Unattributed', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const { account, cards } = await createRewardCard(api, { name: 'Values Card' });
    const dining = await createCategory(api, 'Dining');
    await createRewardRule(api, account.id, { name: 'Base 1%' });
    await createRewardRule(api, account.id, { name: 'Dining bonus', stacking: 'ADDITIVE', categoryIds: [dining.id] });
    await spend(api, account.id, { amount: 1000, date: day(month, 5), categoryIds: [dining.id], cardId: cards[0].id });
    await spend(api, account.id, { amount: 200, date: day(month, 6) });

    const earnings = await fieldValues(api, 'reward_earnings');
    expect(earnings.card).toEqual(['Values Card']);
    expect(earnings.rule).toEqual(['Base 1%', 'Dining bonus']);
    expect(earnings.category).toEqual(['Dining']);
    expect(earnings.cardholder.length).toBeGreaterThan(0);

    const txns = await fieldValues(api, 'transactions');
    expect(txns.card).toEqual(expect.arrayContaining(['Unattributed', `Values Card •••• ${cards[0].last4}`]));
    expect(txns.account).toEqual(['Values Card']);
    expect(txns.category).toEqual(['Dining']);

    // Datasources with no rows for this user still answer, with empty lists.
    expect(await fieldValues(api, 'lendings')).toEqual({ counterpartyName: [], transactionAccount: [] });
    expect(await fieldValues(api, 'fno_trades')).toEqual({ broker: [] });
  });

  test('field values are tenant-scoped, need a session and reject unknown datasources', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Owner Card' });
    await createRewardRule(api, account.id, { name: 'Owner Rule' });
    await spend(api, account.id, { amount: 500, date: day(month, 3) });

    const { api: apiB } = await secondUser(request, 'values-b');
    const foreign = await fieldValues(apiB, 'reward_earnings');
    expect(foreign.rule).toEqual([]);
    expect(foreign.card).toEqual([]);

    await expectUnauthenticated('GET', '/api/v1/report/datasource/reward_earnings/values');

    const unknown = await api.GET('/api/v1/report/datasource/{name}/values', {
      params: { path: { name: 'no_such_datasource' } },
    });
    expect(unknown.response.status).toBe(400);
  });

  test('reward_earnings reconciles with the Rewards page and never double-counts stacked rules', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Parity Card' });
    await createRewardRule(api, account.id, { name: 'Base 1%', percentRate: 1 });
    await createRewardRule(api, account.id, { name: 'Stack 2%', stacking: 'ADDITIVE', percentRate: 2, priority: 5 });
    await createMilestone(api, account.id, { name: 'Spend 1k', threshold: 1000, payoutValue: 500 });
    await spend(api, account.id, { amount: 1000, date: day(month, 5), instantDiscount: 50 });
    await spend(api, account.id, { amount: 500, date: day(month, 12), convenienceFee: 20 });

    const page = await report(api, account.id, month.from, month.to);
    const f = inMonth(month);

    expect(await kpi(api, 'reward_earnings', 'spend', f)).toBe(page.summary.basisSpend);
    expect(await kpi(api, 'reward_earnings', 'amount', f)).toBe(1500);
    expect(await kpi(api, 'reward_earnings', 'txnCount', f)).toBe(page.summary.transactionCount);
    expect(await kpi(api, 'reward_earnings', 'instantDiscount', f)).toBe(page.summary.discounts);
    expect(await kpi(api, 'reward_earnings', 'convenienceFee', f)).toBe(page.summary.fees);

    const earned = await kpi(api, 'reward_earnings', 'valueInr', f);
    const milestones = await kpi(api, 'reward_milestones', 'payoutValueInr', inMonth(month, 'payoutDate'));
    expect(milestones).toBe(500);
    expect(earned + milestones).toBeCloseTo(page.summary.grossValueInr, 2);
    const net = await kpi(api, 'reward_earnings', 'netValueInr', f);
    expect(net + milestones).toBeCloseTo(page.summary.effectiveValueInr, 2);

    // Only ADDITIVE-plus-EXCLUSIVE lines: no transaction is also reported as "no rule".
    const byReason = await chart(api, 'reward_earnings', 'reason', 'txnCount', f);
    expect(Object.keys(byReason)).not.toContain('NO_RULE');
  });

  test('an ADDITIVE-only match produces no NO_RULE line', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Additive Only Card' });
    await createRewardRule(api, account.id, { name: 'Only stack', stacking: 'ADDITIVE', percentRate: 2 });
    await spend(api, account.id, { amount: 1000, date: day(month, 8) });

    const page = await lines(api, account.id, month.from, month.to);
    expect(page.content.map((l) => l.reason)).toEqual(['MATCHED']);
  });

  test('points count toward rupee totals at the card point value; unvalued points stay out', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const slab = { rewardType: 'POINTS', accrualType: 'SLAB', slabSize: 100, pointsPerSlab: 2, pointPrecision: 0 } as const;

    const valued = await createRewardCard(api, { name: 'Valued Points Card' });
    await setRewardConfig(api, valued.account.id, { pointValueInr: 0.5 });
    await createRewardRule(api, valued.account.id, { name: 'Valued slab', ...slab });
    await spend(api, valued.account.id, { amount: 1000, date: day(month, 9) });

    const valuedPage = await report(api, valued.account.id, month.from, month.to);
    expect(valuedPage.summary.points).toBe(20);
    expect(valuedPage.summary.pointsValueInr).toBe(10);
    expect(valuedPage.summary.grossValueInr).toBe(10);

    const valuedFilter: Filter[] = [...inMonth(month), { field: 'card', operator: 'is', value: 'Valued Points Card' }];
    expect(await kpi(api, 'reward_earnings', 'points', valuedFilter)).toBe(20);
    expect(await kpi(api, 'reward_earnings', 'pointsValueInr', valuedFilter)).toBe(10);
    expect(await kpi(api, 'reward_earnings', 'valueInr', valuedFilter)).toBe(10);
    expect(await kpi(api, 'reward_earnings', 'cashInr', valuedFilter)).toBe(0);

    const unvalued = await createRewardCard(api, { name: 'Unvalued Points Card' });
    await createRewardRule(api, unvalued.account.id, { name: 'Unvalued slab', ...slab });
    await spend(api, unvalued.account.id, { amount: 1000, date: day(month, 9) });

    const unvaluedPage = await report(api, unvalued.account.id, month.from, month.to);
    expect(unvaluedPage.summary.points).toBe(20);
    expect(unvaluedPage.summary.pointsValueInr).toBeNull();
    expect(unvaluedPage.summary.grossValueInr).toBe(0);
  });

  test('zero lines on a points card report the POINTS unit', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Points Default Card' });
    await setRewardConfig(api, account.id, { defaultRewardType: 'POINTS' });
    await createRewardRule(api, account.id, { name: 'Fuel only', rewardType: 'POINTS', accrualType: 'SLAB', slabSize: 100, pointsPerSlab: 1, mccs: ['5541'] });
    await spend(api, account.id, { amount: 300, date: day(month, 4), mcc: '5411' });

    const page = await lines(api, account.id, month.from, month.to);
    expect(page.content).toHaveLength(1);
    expect(page.content[0].reason).toBe('NO_RULE');
    expect(page.content[0].earnedUnit).toBe('POINTS');
  });

  test('same-named rules on two cards get distinct labels and filter separately', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const a = await createRewardCard(api, { name: 'Card Alpha' });
    const b = await createRewardCard(api, { name: 'Card Beta' });
    await createRewardRule(api, a.account.id, { name: 'Base 1%', percentRate: 1 });
    await createRewardRule(api, b.account.id, { name: 'Base 1%', percentRate: 1 });
    await spend(api, a.account.id, { amount: 1000, date: day(month, 7) });
    await spend(api, b.account.id, { amount: 3000, date: day(month, 7) });

    const values = await fieldValues(api, 'reward_earnings');
    expect(values.rule).toEqual(['Base 1% · Card Alpha', 'Base 1% · Card Beta']);

    const f = inMonth(month);
    expect(await kpi(api, 'reward_earnings', 'valueInr', [...f, { field: 'rule', operator: 'is', value: 'Base 1% · Card Alpha' }])).toBe(10);
    expect(await kpi(api, 'reward_earnings', 'valueInr', [...f, { field: 'rule', operator: 'in', value: ['Base 1% · Card Beta'] }])).toBe(30);
  });

  test('grouping by category counts a line under each of its categories; filters match any', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Category Card' });
    const travel = await createCategory(api, 'Travel');
    const food = await createCategory(api, 'Food');
    await createRewardRule(api, account.id, { name: 'Base 1%', percentRate: 1 });
    await spend(api, account.id, { amount: 1000, date: day(month, 10), categoryIds: [travel.id, food.id] });
    await spend(api, account.id, { amount: 500, date: day(month, 11) });

    const f = inMonth(month);
    expect(await chart(api, 'reward_earnings', 'category', 'valueInr', f)).toEqual({ '(none)': 5, Food: 10, Travel: 10 });
    expect(await kpi(api, 'reward_earnings', 'valueInr', f)).toBe(15);
    expect(await kpi(api, 'reward_earnings', 'valueInr', [...f, { field: 'category', operator: 'is', value: 'Food' }])).toBe(10);
    expect(await kpi(api, 'reward_earnings', 'valueInr', [...f, { field: 'category', operator: 'is_not', value: 'Food' }])).toBe(5);
  });

  test('negated filters keep rows without a value and charts keep them as (none)', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Channel Card' });
    await createRewardRule(api, account.id, { name: 'Base 1%', percentRate: 1 });
    await spend(api, account.id, { amount: 1000, date: day(month, 14) });
    await spend(api, account.id, { amount: 2000, date: day(month, 15), channel: 'UPI' });

    const f = inMonth(month);
    expect(await kpi(api, 'reward_earnings', 'valueInr', [...f, { field: 'channel', operator: 'is_not', value: 'UPI' }])).toBe(10);
    expect(await kpi(api, 'reward_earnings', 'valueInr', [...f, { field: 'channel', operator: 'not_in', value: ['UPI'] }])).toBe(10);
    expect(await chart(api, 'reward_earnings', 'channel', 'valueInr', f)).toEqual({ '(none)': 10, UPI: 20 });

    const txnFilter: Filter[] = [
      { field: 'date', operator: 'between', value: { from: month.from, to: month.to } },
      { field: 'channel', operator: 'not_in', value: ['UPI'] },
    ];
    expect(await kpi(api, 'transactions', 'amount', txnFilter, 'count')).toBe(1);
  });

  test('reward_milestones and reward_caps report windows, payouts and cap usage', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Milestone Cap Card' });
    await createRewardRule(api, account.id, {
      name: 'Capped 1%',
      percentRate: 1,
      periodCap: 12,
      capWindow: 'CALENDAR_MONTH',
      onCapExhausted: 'STOP',
    });
    await createMilestone(api, account.id, { name: 'Spend 1k', threshold: 1000, payoutValue: 500 });
    await createMilestone(api, account.id, { name: 'Spend 5k', threshold: 5000, payoutValue: 900 });
    await spend(api, account.id, { amount: 1000, date: day(month, 5) });
    await spend(api, account.id, { amount: 500, date: day(month, 20) });

    const ms = await rawRows(api, 'reward_milestones', ['milestone', 'windowStart', 'windowEnd', 'payoutDate', 'progress', 'progressPct', 'payoutValueInr'],
      inMonth(month, 'windowStart'));
    const hit = ms.find((r) => r.milestone === 'Spend 1k')!;
    expect(hit).toMatchObject({ windowStart: month.from, windowEnd: month.to, payoutDate: month.to, progress: 1500, progressPct: 150, payoutValueInr: 500 });
    const missed = ms.find((r) => r.milestone === 'Spend 5k')!;
    expect(missed).toMatchObject({ payoutDate: null, progress: 1500, progressPct: 30, payoutValueInr: 0 });

    const achieved = await rawRows(api, 'reward_milestones', ['milestone', 'achieved'], [...inMonth(month, 'windowStart'), { field: 'achieved', operator: 'is', value: 'Yes' }]);
    expect(achieved).toEqual([expect.objectContaining({ milestone: 'Spend 1k', achieved: 'Yes' })]);
    expect(await chart(api, 'reward_milestones', 'achieved', 'payoutValueInr', inMonth(month, 'windowStart'))).toEqual({ No: 0, Yes: 500 });

    const caps = await rawRows(api, 'reward_caps', ['cap', 'capType', 'window', 'windowStart', 'windowEnd', 'cardholder', 'capLimit', 'used', 'remaining', 'utilizationPct', 'usedValueInr'],
      inMonth(month, 'windowStart'));
    expect(caps).toHaveLength(1);
    expect(caps[0]).toMatchObject({
      cap: 'Capped 1%',
      capType: 'RULE',
      window: 'CALENDAR_MONTH',
      windowStart: month.from,
      windowEnd: month.to,
      cardholder: 'All cardholders',
      capLimit: 12,
      used: 12,
      remaining: 0,
      utilizationPct: 100,
      usedValueInr: 12,
    });
    const reached = await rawRows(api, 'reward_caps', ['cap', 'capHit'], [{ field: 'capHit', operator: 'is', value: 'Yes' }]);
    expect(reached).toEqual([expect.objectContaining({ cap: 'Capped 1%', capHit: 'Yes' })]);
  });

  test('rule, card and milestone filters store stable ids that survive relabelling', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const a = await createRewardCard(api, { name: 'Id Card A' });
    const rule = await createRewardRule(api, a.account.id, { name: 'Cashback 2%', percentRate: 2 });
    const milestone = await createMilestone(api, a.account.id, { name: 'Spend 500', threshold: 500, payoutValue: 25 });
    await spend(api, a.account.id, { amount: 1000, date: day(month, 6) });

    const res = await api.GET('/api/v1/report/datasource/{name}/values', { params: { path: { name: 'reward_earnings' } } });
    expectStatus(res, 200);
    expect(res.data!.options.rule).toEqual([{ value: rule.id, label: 'Cashback 2%' }]);
    expect(res.data!.options.card).toEqual([{ value: a.account.id, label: 'Id Card A' }]);
    const ms = await api.GET('/api/v1/report/datasource/{name}/values', { params: { path: { name: 'reward_milestones' } } });
    expect(ms.data!.options.milestone).toEqual([{ value: milestone.id, label: 'Spend 500' }]);

    const saved = await api.POST('/api/v1/reports', {
      body: {
        name: 'Rule by id',
        type: 'KPI',
        datasource: 'reward_earnings',
        definition: { measure: 'valueInr', aggregation: 'sum', filters: [{ field: 'rule', operator: 'is', value: rule.id }] },
      } as never,
    });
    expectStatus(saved, 201);
    const runSaved = async () => {
      const r = await api.POST('/api/v1/reports/{id}/data', { params: { path: { id: (saved.data as { id: string }).id } } });
      return Number((r.data as unknown as { value: number }).value);
    };
    expect(await runSaved()).toBe(20);

    // A same-named rule on another card relabels "Cashback 2%" to "Cashback 2% · Id Card A".
    const b = await createRewardCard(api, { name: 'Id Card B' });
    await createRewardRule(api, b.account.id, { name: 'Cashback 2%', percentRate: 2 });
    await spend(api, b.account.id, { amount: 500, date: day(month, 7) });
    expect(await runSaved()).toBe(20);
    expect(await kpi(api, 'reward_earnings', 'valueInr', [{ field: 'rule', operator: 'is_not', value: rule.id }])).toBe(10);
    expect(await kpi(api, 'reward_earnings', 'valueInr', [{ field: 'card', operator: 'in', value: [b.account.id] }])).toBe(10);
    expect(await kpi(api, 'reward_milestones', 'payoutValueInr', [{ field: 'milestone', operator: 'is', value: milestone.id }])).toBe(25);
  });

  test('pie charts ignore a series split', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Pie Card' });
    await createRewardRule(api, account.id, { name: 'Base 1%', percentRate: 1 });
    await createRewardRule(api, account.id, { name: 'Stack 2%', stacking: 'ADDITIVE', percentRate: 2, priority: 5 });
    await spend(api, account.id, { amount: 1000, date: day(month, 8) });

    for (const chartType of ['pie', 'donut']) {
      const data = (await runAdHoc(api, {
        type: 'CHART',
        datasource: 'reward_earnings',
        definition: { chartType, dimension: { field: 'card' }, series: { field: 'rule' }, measure: { field: 'valueInr', aggregation: 'sum' }, filters: [] },
      } as never)) as unknown as { categories: string[]; series: Array<{ data: number[] }> };
      expect(data.categories).toEqual(['Pie Card']);
      expect(data.series).toHaveLength(1);
      expect(data.series[0].data).toEqual([30]);
    }
  });

  test('transactions reports group by link type and combine card with category', async ({ request }) => {
    const { api } = await freshUser(request, 'reward-reports');
    const month = fixedMonth();
    const bank = await createBankAccount(api, { name: 'Link Bank' });
    const { account, cards } = await createRewardCard(api, { name: 'Link Card' });
    const food = await createCategory(api, 'Food');
    const pay = await createTransaction(api, bank.id, { amount: -500, date: day(month, 3), description: 'Card bill' });
    const paid = await createTransaction(api, account.id, { amount: 500, date: day(month, 3), description: 'Payment received' });
    const link = await api.POST('/api/v1/transaction-links', {
      body: { type: 'CC_PAYMENT', members: [{ transactionId: pay.id, isAnchor: true }, { transactionId: paid.id, isAnchor: false }] } as never,
    });
    expectStatus(link, 201);
    await spend(api, account.id, { amount: 1000, date: day(month, 5), categoryIds: [food.id], cardId: cards[0].id });

    const byLink = await chart(api, 'transactions', 'linkType', 'amount', []);
    expect(byLink).toEqual({ '(none)': -1000, CC_PAYMENT: 0 });
    expect(await kpi(api, 'transactions', 'amount', [{ field: 'linkType', operator: 'is', value: 'CC_PAYMENT' }], 'count')).toBe(2);

    const byCardAndCategory = (await runAdHoc(api, {
      type: 'CHART',
      datasource: 'transactions',
      definition: { chartType: 'stackedBar', dimension: { field: 'card' }, series: { field: 'category' }, measure: { field: 'amount', aggregation: 'sum' }, filters: [] },
    } as never)) as unknown as { categories: string[]; series: Array<{ name: string; data: number[] }> };
    const food1 = byCardAndCategory.series.find((s) => s.name === 'Food')!;
    expect(food1.data[byCardAndCategory.categories.indexOf(`Link Card •••• ${cards[0].last4}`)]).toBe(-1000);
    expect(await kpi(api, 'transactions', 'amount', [
      { field: 'category', operator: 'is', value: 'Food' },
      { field: 'card', operator: 'is', value: `Link Card •••• ${cards[0].last4}` },
    ], 'count')).toBe(1);
  });
});
