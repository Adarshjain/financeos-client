import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { istNow } from '../fixtures/dates';
import { genCardPdf } from '../fixtures/gen/statements';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { runAdHoc } from '../fixtures/seed/reports';
import { createRewardRule, report } from '../fixtures/seed/rewards';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, freshUser, test } from '../fixtures/test';

// ---------- date helpers (UTC, relative to today so the spec holds on any day) ----------

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 864e5);
}
const CLOSING_DAY = 10;
const today = (() => {
  const n = istNow();
  return utc(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
})();
/** The latest closing day (the 10th) strictly before today: the end of the imported statement. */
const statementEnd =
  today.getUTCDate() > CLOSING_DAY
    ? utc(today.getUTCFullYear(), today.getUTCMonth(), CLOSING_DAY)
    : utc(today.getUTCFullYear(), today.getUTCMonth() - 1, CLOSING_DAY);
const statementStart = addDays(utc(statementEnd.getUTCFullYear(), statementEnd.getUTCMonth() - 1, CLOSING_DAY), 1);
/** The current cycle is projected from the statement: the day after it, through the next 10th. */
const currentStart = addDays(statementEnd, 1);
const currentEnd = utc(statementEnd.getUTCFullYear(), statementEnd.getUTCMonth() + 1, CLOSING_DAY);
const monthStart = utc(today.getUTCFullYear(), today.getUTCMonth(), 1);
const monthEnd = utc(today.getUTCFullYear(), today.getUTCMonth() + 1, 0);
const prevMonthStart = utc(today.getUTCFullYear(), today.getUTCMonth() - 1, 1);
const prevMonthEnd = utc(today.getUTCFullYear(), today.getUTCMonth(), 0);
const label = (a: Date, b: Date) => `${iso(a)} → ${iso(b)}`;

type Filter = { field: string; operator: string; value?: unknown };

async function kpi(api: ApiClient, datasource: string, measure: string, filters: Filter[], comparison?: unknown) {
  return (await runAdHoc(api, {
    type: 'KPI',
    datasource,
    definition: { measure, aggregation: 'sum', filters, ...(comparison ? { comparison } : {}) },
  } as never)) as unknown as {
    value: number;
    comparison: { previousValue: number; previousDateRange: { from: string; to: string } } | null;
    meta: { dateRange: { from: string; to: string } | null };
  };
}

async function byCycle(api: ApiClient, account: string, filters: Filter[] = []): Promise<Record<string, number>> {
  const chart = (await runAdHoc(api, {
    type: 'CHART',
    datasource: 'transactions',
    definition: {
      chartType: 'bar',
      dimension: { field: 'billingCycle' },
      measure: { field: 'amount', aggregation: 'sum' },
      filters: [{ field: 'account', operator: 'is', value: account }, ...filters],
    },
  } as never)) as unknown as { categories: string[]; series: Array<{ data: number[] }> };
  return Object.fromEntries(chart.categories.map((c, i) => [c, chart.series[0].data[i]]));
}

async function ingestStatement(api: ApiClient, cardId: string, last4: string, start: string, end: string, rows: Array<[string, number]>) {
  const pdf = await genCardPdf({
    issuer: 'HDFC Bank',
    cardLast4: last4,
    statementDate: end,
    periodStart: start,
    periodEnd: end,
    previousBalance: 0,
    paymentsReceived: 0,
    financeCharges: 0,
    creditLimit: 100000,
    rows: rows.map(([date, debit], i) => ({ date, description: `STATEMENT ROW ${i + 1}`, debit })),
  });
  const { job, result } = await uploadAndIngest(api, cardId, [{ filename: `statement-${start}.pdf`, buffer: pdf }]);
  expect(result, `ingest job ${JSON.stringify(job)}`).not.toBeNull();
  expect(result.fileDetails[0].status).toBe('SUCCESS');
}

const account = (name: string): Filter => ({ field: 'account', operator: 'is', value: name });

/** Card A has one imported statement; card B none (calendar months); a bank account uses calendar months. */
async function seed(api: ApiClient) {
  await resetLlm(api);
  await setLlmMode(api, 'SCHEMA_DEFAULT');
  const cardA = await createCreditCard(api, { name: 'Cycle Card A', creditLimit: 200000 });
  await ingestStatement(api, cardA.id, '4321', iso(statementStart), iso(statementEnd), [
    [iso(addDays(statementStart, 2)), 1000],
    [iso(addDays(statementStart, 5)), 500],
  ]);
  await createTransaction(api, cardA.id, { amount: -2000, date: iso(today), description: 'Current cycle A' });

  const cardB = await createCreditCard(api, { name: 'Cycle Card B', last4: '9999' } as never);
  await createTransaction(api, cardB.id, { amount: -400, date: iso(today), description: 'Current month B' });
  await createTransaction(api, cardB.id, { amount: -700, date: iso(addDays(prevMonthStart, 14)), description: 'Previous month B' });

  const bank = await createBankAccount(api, { name: 'Cycle Bank' });
  await createTransaction(api, bank.id, { amount: -999, date: iso(today), description: 'Bank spend' });
  return { cardA, cardB, bank };
}

test.describe('Billing-cycle reports API (@api)', () => {
  test('catalog flags the billing-cycle fields and the account field reports must pick', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    const res = await api.GET('/api/v1/report/datasource');
    expectStatus(res, 200);
    const data = res.data!;
    expect(data.operators.date.cycle).toEqual(['this_billing_cycle', 'previous_billing_cycle']);
    const ds = (name: string) => data.datasources.find((d) => d.name === name)!;
    const flagged = (name: string) => ds(name).fields.filter((f) => f.billingCycle).map((f) => f.name);
    expect(flagged('transactions')).toEqual(['date', 'billingCycle']);
    expect(flagged('reward_earnings')).toEqual(['effectiveDate', 'cycle']);
    expect(flagged('investment_trades')).toEqual([]);
    expect(ds('transactions').billingCycleAccountField).toBe('account');
    expect(ds('reward_earnings').billingCycleAccountField).toBe('card');
    expect(ds('investment_trades').billingCycleAccountField).toBeUndefined();
  });

  test('this / previous billing cycle follow the one selected account: statement, projection or calendar month', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    await seed(api);

    const a = await kpi(api, 'transactions', 'amount', [account('Cycle Card A'), { field: 'date', operator: 'this_billing_cycle' }],
      { enabled: true, period: 'previous_period', higherIsBetter: false });
    expect(a.value).toBe(-2000);
    expect(a.meta.dateRange).toEqual({ from: iso(currentStart), to: iso(currentEnd) });
    expect(a.comparison!.previousValue).toBe(-1500);
    expect(a.comparison!.previousDateRange).toEqual({ from: iso(statementStart), to: iso(statementEnd) });
    expect((await kpi(api, 'transactions', 'amount', [account('Cycle Card A'), { field: 'date', operator: 'previous_billing_cycle' }])).value).toBe(-1500);

    // No statements: the calendar month.
    const b = await kpi(api, 'transactions', 'amount', [account('Cycle Card B'), { field: 'date', operator: 'this_billing_cycle' }],
      { enabled: true, period: 'previous_period' });
    expect(b.value).toBe(-400);
    expect(b.meta.dateRange).toEqual({ from: iso(monthStart), to: iso(monthEnd) });
    expect(b.comparison!.previousValue).toBe(-700);

    // A bank account has no billing cycle: the calendar month too.
    const bank = await kpi(api, 'transactions', 'amount', [account('Cycle Bank'), { field: 'date', operator: 'this_billing_cycle' }]);
    expect(bank.value).toBe(-999);
    expect(bank.meta.dateRange).toEqual({ from: iso(monthStart), to: iso(monthEnd) });
  });

  test('a billing-cycle filter or grouping without exactly one account is rejected', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    const run = (definition: unknown, type = 'KPI') =>
      api.POST('/api/v1/reports/data', { body: { type, datasource: 'transactions', definition } as never });
    const cycle = { field: 'date', operator: 'this_billing_cycle' };
    const cases = [
      await run({ measure: 'amount', aggregation: 'sum', filters: [cycle] }),
      await run({ measure: 'amount', aggregation: 'sum', filters: [cycle, { field: 'account', operator: 'in', value: ['A', 'B'] }] }),
      await run({ measure: 'amount', aggregation: 'sum', filters: [cycle, account('A'), account('B')] }),
      await run({ chartType: 'bar', dimension: { field: 'billingCycle' }, measure: { field: 'amount', aggregation: 'sum' }, filters: [] }, 'CHART'),
      await run({ mode: 'raw', columns: ['date', 'billingCycle'], filters: [] }, 'TABLE'),
    ];
    for (const res of cases) {
      expect(res.response.status).toBe(400);
      expect((res.error as { message?: string }).message).toContain('Billing cycles differ per account');
    }
    const settlement = await run({ measure: 'amount', aggregation: 'sum', filters: [account('A'), { field: 'settlementDate', operator: 'this_billing_cycle' }] });
    expect(settlement.response.status).toBe(400);
    const trades = await api.POST('/api/v1/reports/data', {
      body: { type: 'KPI', datasource: 'investment_trades', definition: { measure: 'quantity', aggregation: 'sum', filters: [{ field: 'tradeDate', operator: 'this_billing_cycle' }] } } as never,
    });
    expect(trades.response.status).toBe(400);
  });

  test('grouping by billing cycle shows the selected account cycles', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    await seed(api);
    expect(await byCycle(api, 'Cycle Card A')).toEqual({
      [label(statementStart, statementEnd)]: -1500,
      [label(currentStart, currentEnd)]: -2000,
    });
    expect(await byCycle(api, 'Cycle Card B')).toEqual({
      [label(prevMonthStart, prevMonthEnd)]: -700,
      [label(monthStart, monthEnd)]: -400,
    });
    expect(await byCycle(api, 'Cycle Bank')).toEqual({ [label(monthStart, monthEnd)]: -999 });
  });

  test('a swipe posted after the close counts in the cycle it was posted in, for filters and grouping alike', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    const { cardA } = await seed(api);
    // Swiped on the closing day, posted two days later: it belongs to the current cycle.
    const swipe = await createTransaction(api, cardA.id, { amount: -900, date: iso(statementEnd), description: 'Closing-day swipe' });
    const update = await api.PUT('/api/v1/transactions/{id}', {
      params: { path: { id: swipe.id } },
      body: { accountId: cardA.id, amount: -900, date: iso(statementEnd), description: 'Closing-day swipe', rewardDetails: { settlementDate: iso(addDays(statementEnd, 2)) } } as never,
    });
    expectStatus(update, 200);
    const previous = [account('Cycle Card A'), { field: 'date', operator: 'previous_billing_cycle' }];
    expect((await kpi(api, 'transactions', 'amount', previous)).value).toBe(-1500);
    expect(await byCycle(api, 'Cycle Card A', [{ field: 'date', operator: 'previous_billing_cycle' }])).toEqual({
      [label(statementStart, statementEnd)]: -1500,
    });
    expect((await byCycle(api, 'Cycle Card A'))[label(currentStart, currentEnd)]).toBe(-2900);
  });

  test('overlapping statements never count a transaction twice; month-end cards stay on the month end', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
    const overlap = await createCreditCard(api, { name: 'Overlap Card', last4: '1111' } as never);
    await ingestStatement(api, overlap.id, '1111', '2026-08-12', '2026-09-11', [['2026-08-20', 1000], ['2026-09-05', 500]]);
    await ingestStatement(api, overlap.id, '1111', '2026-09-01', '2026-09-30', [['2026-09-20', 300], ['2026-09-25', 200]]);
    // The later statement wins the overlap: 12 Aug - 31 Aug, then 1 - 30 Sep.
    expect(await byCycle(api, 'Overlap Card')).toEqual({
      '2026-08-12 → 2026-08-31': -1000,
      '2026-09-01 → 2026-09-30': -1000,
    });

    const monthEnd = await createCreditCard(api, { name: 'Month End Card', last4: '3333' } as never);
    await ingestStatement(api, monthEnd.id, '3333', '2026-01-01', '2026-01-31', [['2026-01-10', 100], ['2026-01-20', 100]]);
    await ingestStatement(api, monthEnd.id, '3333', '2026-02-01', '2026-02-28', [['2026-02-10', 100], ['2026-02-20', 100]]);
    await createTransaction(api, monthEnd.id, { amount: -50, date: '2026-03-15', description: 'mid March' });
    await createTransaction(api, monthEnd.id, { amount: -70, date: '2026-03-30', description: 'end of March' });
    expect(await byCycle(api, 'Month End Card', [{ field: 'date', operator: 'between', value: { from: '2026-01-01', to: '2026-03-31' } }])).toEqual({
      '2026-01-01 → 2026-01-31': -200,
      '2026-02-01 → 2026-02-28': -200,
      '2026-03-01 → 2026-03-31': -120,
    });
  });

  test('reward earnings filter by the selected card cycle and statement-cycle caps follow the projected cycle', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    const { cardA } = await seed(api);
    await createRewardRule(api, cardA.id, { name: 'A 1% cycle cap', percentRate: 1, periodCap: 15, capWindow: 'STATEMENT_CYCLE' });

    const card = { field: 'card', operator: 'is', value: cardA.id };
    const current = await kpi(api, 'reward_earnings', 'spend', [card, { field: 'effectiveDate', operator: 'this_billing_cycle' }],
      { enabled: true, period: 'previous_period' });
    expect(current.value).toBe(2000);
    expect(current.comparison!.previousValue).toBe(1500);
    expect(current.meta.dateRange).toEqual({ from: iso(currentStart), to: iso(currentEnd) });

    const page = await report(api, cardA.id, iso(currentStart), iso(currentEnd));
    const cap = (page.rules[0] as unknown as { capStatus: { windowStart: string; windowEnd: string; used: number; cycleFallback: boolean } }).capStatus;
    expect(cap).toMatchObject({ windowStart: iso(currentStart), windowEnd: iso(currentEnd), used: 15, cycleFallback: false });
  });
});
