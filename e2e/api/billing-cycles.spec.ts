import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { resetLlm, setLlmMode } from '../fixtures/control';
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
  const n = new Date();
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

/** Card A has one imported statement; card B none (calendar months); a bank account is never in a cycle. */
async function seed(api: ApiClient) {
  await resetLlm(api);
  await setLlmMode(api, 'SCHEMA_DEFAULT');
  const cardA = await createCreditCard(api, { name: 'Cycle Card A', creditLimit: 200000 });
  const pdf = await genCardPdf({
    issuer: 'HDFC Bank',
    cardLast4: '4321',
    statementDate: iso(statementEnd),
    periodStart: iso(statementStart),
    periodEnd: iso(statementEnd),
    previousBalance: 0,
    paymentsReceived: 0,
    financeCharges: 0,
    creditLimit: 200000,
    rows: [
      { date: iso(addDays(statementStart, 2)), description: 'STATEMENT CYCLE SPEND', debit: 1000 },
      { date: iso(addDays(statementStart, 5)), description: 'STATEMENT CYCLE GROCERY', debit: 500 },
    ],
  });
  const { job, result } = await uploadAndIngest(api, cardA.id, [{ filename: 'cycle-statement.pdf', buffer: pdf }]);
  expect(result, `ingest job ${JSON.stringify(job)}`).not.toBeNull();
  expect(result.fileDetails[0].status).toBe('SUCCESS');
  await createTransaction(api, cardA.id, { amount: -2000, date: iso(today), description: 'Current cycle A' });

  const cardB = await createCreditCard(api, { name: 'Cycle Card B', last4: '9999' } as never);
  await createTransaction(api, cardB.id, { amount: -400, date: iso(today), description: 'Current month B' });
  await createTransaction(api, cardB.id, { amount: -700, date: iso(addDays(prevMonthStart, 14)), description: 'Previous month B' });

  const bank = await createBankAccount(api, { name: 'Cycle Bank' });
  await createTransaction(api, bank.id, { amount: -999, date: iso(today), description: 'Bank spend' });
  return { cardA, cardB, bank };
}

test.describe('Billing-cycle reports API (@api)', () => {
  test('catalog offers the cycle operators only on billing-cycle date fields', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    const res = await api.GET('/api/v1/report/datasource');
    expectStatus(res, 200);
    const data = res.data!;
    expect(data.operators.date.cycle).toEqual(['this_billing_cycle', 'previous_billing_cycle']);
    const flagged = (ds: string) =>
      data.datasources.find((d) => d.name === ds)!.fields.filter((f) => f.billingCycle).map((f) => f.name);
    expect(flagged('transactions')).toEqual(['date', 'settlementDate']);
    expect(flagged('reward_earnings')).toEqual(['effectiveDate', 'transactionDate']);
    expect(flagged('investment_trades')).toEqual([]);
    const billingCycle = data.datasources.find((d) => d.name === 'transactions')!.fields.find((f) => f.name === 'billingCycle');
    expect(billingCycle).toMatchObject({ type: 'string', role: 'dimension' });
  });

  test('this / previous billing cycle keep each card to its own cycle and leave other accounts out', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    await seed(api);

    const current = await kpi(api, 'transactions', 'amount', [{ field: 'date', operator: 'this_billing_cycle' }],
      { enabled: true, period: 'previous_period', higherIsBetter: false });
    // A's projected current cycle (-2000) + B's calendar month (-400); the bank's -999 is excluded.
    expect(current.value).toBe(-2400);
    expect(current.comparison!.previousValue).toBe(-2200);
    expect(current.meta.dateRange).toEqual({
      from: iso(currentStart < monthStart ? currentStart : monthStart),
      to: iso(currentEnd > monthEnd ? currentEnd : monthEnd),
    });
    expect(current.comparison!.previousDateRange).toEqual({
      from: iso(statementStart < prevMonthStart ? statementStart : prevMonthStart),
      to: iso(statementEnd > prevMonthEnd ? statementEnd : prevMonthEnd),
    });

    const previous = await kpi(api, 'transactions', 'amount', [{ field: 'date', operator: 'previous_billing_cycle' }]);
    // A's imported statement (-1500) + B's previous calendar month (-700).
    expect(previous.value).toBe(-2200);

    const onlyA = await kpi(api, 'transactions', 'amount', [
      { field: 'date', operator: 'this_billing_cycle' },
      { field: 'account', operator: 'is', value: 'Cycle Card A' },
    ]);
    expect(onlyA.value).toBe(-2000);
  });

  test('transactions group by billing cycle per card', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    await seed(api);
    const chart = (await runAdHoc(api, {
      type: 'CHART',
      datasource: 'transactions',
      definition: { chartType: 'bar', dimension: { field: 'billingCycle' }, measure: { field: 'amount', aggregation: 'sum' }, filters: [] },
    } as never)) as unknown as { categories: string[]; series: Array<{ data: number[] }> };
    const byCycle = Object.fromEntries(chart.categories.map((c, i) => [c, chart.series[0].data[i]]));
    const expected: Record<string, number> = {
      [label(statementStart, statementEnd)]: -1500,
      [label(currentStart, currentEnd)]: -2000,
      [label(prevMonthStart, prevMonthEnd)]: -700,
      [label(monthStart, monthEnd)]: -400,
      '(none)': -999,
    };
    expect(byCycle).toEqual(expected);
  });

  test('reward earnings filter by billing cycle and statement-cycle caps follow the projected cycle', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    const { cardA } = await seed(api);
    await createRewardRule(api, cardA.id, { name: 'A 1% cycle cap', percentRate: 1, periodCap: 15, capWindow: 'STATEMENT_CYCLE' });

    const current = await kpi(api, 'reward_earnings', 'spend', [{ field: 'effectiveDate', operator: 'this_billing_cycle' }],
      { enabled: true, period: 'previous_period' });
    expect(current.value).toBe(2000);
    expect(current.comparison!.previousValue).toBe(1500);

    const page = await report(api, cardA.id, iso(currentStart), iso(currentEnd));
    const cap = (page.rules[0] as unknown as { capStatus: { windowStart: string; windowEnd: string; used: number; cycleFallback: boolean } }).capStatus;
    expect(cap).toMatchObject({ windowStart: iso(currentStart), windowEnd: iso(currentEnd), used: 15, cycleFallback: false });
  });

  test('cycle operators are rejected on other date fields and match nothing for a user without cards', async ({ request }) => {
    const { api } = await freshUser(request, 'billing-cycles');
    const bad = await api.POST('/api/v1/reports/data', {
      body: { type: 'KPI', datasource: 'investment_trades', definition: { measure: 'quantity', aggregation: 'sum', filters: [{ field: 'tradeDate', operator: 'this_billing_cycle' }] } } as never,
    });
    expect(bad.response.status).toBe(400);
    expect((bad.error as { message?: string }).message).toContain('billing-cycle');

    const bank = await createBankAccount(api, { name: 'Only Bank' });
    await createTransaction(api, bank.id, { amount: -500, date: iso(today), description: 'Bank only' });
    const none = await kpi(api, 'transactions', 'amount', [{ field: 'date', operator: 'this_billing_cycle' }]);
    expect(none.value).toBe(0);
    expect(none.meta.dateRange).toBeNull();
  });
});
