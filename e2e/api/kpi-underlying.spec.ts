import { randomUUID } from 'node:crypto';

import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createCreditCard, createGenericAccount } from '../fixtures/seed/accounts';
import { addLending, createCounterparty } from '../fixtures/seed/loans';
import { ingestCardStatement } from '../fixtures/seed/nav';
import { createReport, runSaved } from '../fixtures/seed/reports';
import { createRewardCard, createRewardRule, fixedMonth, spend } from '../fixtures/seed/rewards';
import { createCategory, createTransaction, searchAll } from '../fixtures/seed/transactions';
import {
  csvLines,
  dayOf,
  ddmmyyyy,
  type Filter,
  inMonth,
  kpiBody,
  kpiFigures,
  monthBefore,
  NET_WORTH_KIND_LABELS,
  NET_WORTH_SIDE_LABELS,
  PREVIOUS_PERIOD,
  seedSpendMonths,
  startsWithBom,
  tableOf,
  underlyingAdHoc,
  underlyingAdHocCsv,
  underlyingBuiltin,
  underlyingBuiltinCsv,
  underlyingSaved,
  underlyingSavedCsv,
} from '../fixtures/seed/underlying';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const debits: Filter = { field: 'type', operator: 'is', value: 'DEBIT' };
const descriptions = (res: { table: unknown }) => tableOf(res).rows.map((r) => r.description);

test.describe('KPI underlying data: transactions (@api)', () => {
  test('a saved SUM KPI lists the rows behind its value for this and the previous period', async ({ request }) => {
    const { api } = await newUser(request, 'vud-saved');
    const ds = await seedSpendMonths(api);
    const definition = {
      measure: 'spend',
      aggregation: 'sum',
      filters: [{ field: 'category', operator: 'in', value: [ds.food.name, ds.travel.name] }, inMonth(ds.current)],
      comparison: PREVIOUS_PERIOD,
    };
    const report = await createReport(api, { name: 'VUD saved', type: 'KPI', datasource: 'transactions', definition } as never);
    const kpi = (await runSaved(api, report.id)) as unknown as { value: number; comparison: { previousValue: number } };
    expect(kpi.value).toBe(1800);
    expect(kpi.comparison.previousValue).toBe(500);

    const current = await underlyingSaved(api, report.id);
    expect(current).toMatchObject({
      period: 'current',
      datasource: 'transactions',
      range: { from: ds.current.from, to: ds.current.to },
      previousAvailable: true,
      previousRange: { from: ds.previous.from, to: ds.previous.to },
      measure: 'spend',
      measureLabel: 'Spend',
      aggregation: 'sum',
      format: 'currency',
      value: kpi.value,
      rowCount: 4,
      winnerOnly: false,
      summaryLines: [],
      rowAction: 'transaction',
      groupField: null,
      notCounted: [],
      sortKey: null,
      sortDirection: null,
    });
    expect(current.filters).toEqual([
      { field: 'category', fieldLabel: 'Category', operator: 'in', text: `in ${ds.food.name}, ${ds.travel.name}` },
      {
        field: 'date',
        fieldLabel: 'Date',
        operator: 'between',
        text: `Between ${ddmmyyyy(ds.current.from)} and ${ddmmyyyy(ds.current.to)}`,
      },
    ]);
    const table = tableOf(current);
    expect(table.columns).toEqual([
      { key: 'date', label: 'Date', type: 'date', format: null },
      { key: 'description', label: 'Description', type: 'string', format: null },
      { key: 'account', label: 'Account', type: 'enum', format: null },
      { key: 'category', label: 'Category', type: 'enum', format: null },
      { key: 'spend', label: 'Spend', type: 'number', format: 'currency' },
    ]);
    // Newest first by default; each row carries its transaction id for the row action.
    expect(table.rows).toEqual([
      { id: ds.ids.Bus, date: dayOf(ds.current, 18), description: 'Bus', account: ds.account.name, category: ds.travel.name, spend: 100 },
      { id: ds.ids.Uber, date: dayOf(ds.current, 12), description: 'Uber', account: ds.account.name, category: ds.travel.name, spend: 300 },
      { id: ds.ids.Zomato, date: dayOf(ds.current, 8), description: 'Zomato', account: ds.account.name, category: ds.food.name, spend: 700 },
      { id: ds.ids.Swiggy, date: dayOf(ds.current, 3), description: 'Swiggy', account: ds.account.name, category: ds.food.name, spend: 700 },
    ]);
    expect(table.page).toEqual({ number: 0, size: 25, totalElements: 4, totalPages: 1 });

    const previous = await underlyingSaved(api, report.id, { period: 'previous' });
    expect(previous).toMatchObject({
      period: 'previous',
      range: { from: ds.previous.from, to: ds.previous.to },
      previousAvailable: true,
      previousRange: { from: ds.previous.from, to: ds.previous.to },
      value: kpi.comparison.previousValue,
      rowCount: 3,
    });
    expect(descriptions(previous)).toEqual(['Taxi', 'Tea', 'Cafe']);
    // The previous period's chips show the window the date filter was swapped for.
    expect(previous.filters.map((f) => f.text)).toEqual([
      `in ${ds.food.name}, ${ds.travel.name}`,
      `Between ${ddmmyyyy(ds.previous.from)} and ${ddmmyyyy(ds.previous.to)}`,
    ]);
  });

  test('each aggregation equals the KPI figure for both periods and MIN/MAX list only the winning rows', async ({ request }) => {
    const { api } = await newUser(request, 'vud-aggs');
    const ds = await seedSpendMonths(api);
    // Debits: current 700 (Swiggy), 700 (Zomato), 300 (Uber), 100 (Bus); previous 50 (Cafe), 50 (Tea), 400 (Taxi).
    const cases: Array<{ aggregation: string; current: { rows: string[]; winnerOnly: boolean }; previous: { rows: string[] } }> = [
      { aggregation: 'sum', current: { rows: ['Bus', 'Uber', 'Zomato', 'Swiggy'], winnerOnly: false }, previous: { rows: ['Taxi', 'Tea', 'Cafe'] } },
      { aggregation: 'avg', current: { rows: ['Bus', 'Uber', 'Zomato', 'Swiggy'], winnerOnly: false }, previous: { rows: ['Taxi', 'Tea', 'Cafe'] } },
      { aggregation: 'count', current: { rows: ['Bus', 'Uber', 'Zomato', 'Swiggy'], winnerOnly: false }, previous: { rows: ['Taxi', 'Tea', 'Cafe'] } },
      // MIN: one winner now, a tie (Cafe and Tea at 50) before.
      { aggregation: 'min', current: { rows: ['Bus'], winnerOnly: true }, previous: { rows: ['Tea', 'Cafe'] } },
      // MAX: a tie now (Swiggy and Zomato at 700), one winner before.
      { aggregation: 'max', current: { rows: ['Zomato', 'Swiggy'], winnerOnly: true }, previous: { rows: ['Taxi'] } },
    ];
    const expectedValues: Record<string, [number, number]> = {
      sum: [1800, 500],
      avg: [450, 500 / 3],
      count: [4, 3],
      min: [100, 50],
      max: [700, 400],
    };
    for (const c of cases) {
      const body = kpiBody('transactions', {
        measure: 'spend',
        aggregation: c.aggregation,
        filters: [debits, inMonth(ds.current)],
        comparison: PREVIOUS_PERIOD,
      });
      const kpi = await kpiFigures(api, body);
      expect(Number(kpi.value), `${c.aggregation} current KPI`).toBeCloseTo(expectedValues[c.aggregation][0], 2);
      expect(Number(kpi.previousValue), `${c.aggregation} previous KPI`).toBeCloseTo(expectedValues[c.aggregation][1], 2);

      const current = await underlyingAdHoc(api, body);
      expect(current.value, `${c.aggregation}: the underlying value is the KPI value`).toBe(kpi.value);
      expect(current.aggregation).toBe(c.aggregation);
      expect(current.winnerOnly, c.aggregation).toBe(c.current.winnerOnly);
      expect(descriptions(current), c.aggregation).toEqual(c.current.rows);
      expect(current.rowCount, c.aggregation).toBe(c.current.rows.length);

      const previous = await underlyingAdHoc(api, body, { period: 'previous' });
      expect(previous.value, `${c.aggregation}: the previous value is the KPI's previous value`).toBe(kpi.previousValue);
      expect(descriptions(previous), `${c.aggregation} previous`).toEqual(c.previous.rows);
      expect(previous.rowCount).toBe(c.previous.rows.length);
    }
  });

  test('rows without the measure are not listed', async ({ request }) => {
    const { api } = await newUser(request, 'vud-null-measure');
    const card = await createCreditCard(api, { name: 'VUD Discount Card' });
    await createTransaction(api, card.id, { amount: -1000, description: 'With discount', rewardDetails: { instantDiscount: 50 } as never });
    await createTransaction(api, card.id, { amount: -400, description: 'No discount' });

    for (const aggregation of ['sum', 'count']) {
      const body = kpiBody('transactions', { measure: 'instantDiscount', aggregation, filters: [] });
      const kpi = await kpiFigures(api, body);
      const res = await underlyingAdHoc(api, body);
      expect(res.value).toBe(kpi.value);
      expect(res.value).toBe(aggregation === 'sum' ? 50 : 1);
      expect(descriptions(res), aggregation).toEqual(['With discount']);
      expect(tableOf(res).rows[0].instantDiscount).toBe(50);
    }
    // The same rows under a measure every row has are all listed.
    const all = await underlyingAdHoc(api, kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters: [] }));
    expect(all.rowCount).toBe(2);
  });

  test('a MIN/MAX over no rows has no value and lists nothing', async ({ request }) => {
    const { api } = await newUser(request, 'vud-empty');
    await seedSpendMonths(api);
    for (const aggregation of ['max', 'min']) {
      const body = kpiBody('transactions', {
        measure: 'spend',
        aggregation,
        filters: [{ field: 'description', operator: 'contains', value: 'no such row' }],
      });
      const kpi = await kpiFigures(api, body);
      expect(kpi.value).toBeNull();
      const res = await underlyingAdHoc(api, body);
      expect(res).toMatchObject({ value: null, rowCount: 0, winnerOnly: true, range: null, previousAvailable: false, previousRange: null });
      expect(tableOf(res).rows).toEqual([]);
    }
  });

  test('filter chips render each clause the way people read it', async ({ request }) => {
    const { api } = await newUser(request, 'vud-chips');
    const ds = await seedSpendMonths(api);
    const res = await underlyingAdHoc(
      api,
      kpiBody('transactions', {
        measure: 'spend',
        aggregation: 'sum',
        filters: [
          { field: 'category', operator: 'in', value: [ds.food.name, ds.travel.name] },
          { field: 'category', operator: 'not_in', value: ['Rent'] },
          { field: 'account', operator: 'is', value: ds.account.name },
          { field: 'accountType', operator: 'is_not', value: 'credit_card' },
          debits,
          { field: 'isExcluded', operator: 'is', value: false },
          { field: 'description', operator: 'contains', value: 'o' },
          { field: 'description', operator: 'starts_with', value: 'Z' },
          { field: 'spend', operator: 'greater_than', value: 99.5 },
          { field: 'spend', operator: 'between', value: { from: 100, to: 1000 } },
          { field: 'date', operator: 'last_x_days', value: { amount: 3650 } },
        ],
      })
    );
    expect(res.filters.map((f) => [f.fieldLabel, f.text])).toEqual([
      ['Category', `in ${ds.food.name}, ${ds.travel.name}`],
      ['Category', 'not in Rent'],
      ['Account', `is ${ds.account.name}`],
      ['Account Type', 'is not credit_card'],
      ['Type', 'is DEBIT'],
      ['Is Excluded', 'is No'],
      ['Description', 'contains o'],
      ['Description', 'starts with Z'],
      ['Spend', 'greater than 99.5'],
      ['Spend', 'between 100 and 1000'],
      ['Date', 'Last 3650 days'],
    ]);
    // Only Zomato matches all of them.
    expect(descriptions(res)).toEqual(['Zomato']);

    const named = await underlyingAdHoc(
      api,
      kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters: [{ field: 'date', operator: 'this_month' }] })
    );
    expect(named.filters).toEqual([{ field: 'date', fieldLabel: 'Date', operator: 'this_month', text: 'This month' }]);
  });

  test('a list of rows that needs more than one page is paged 0-based, default 25, capped at 1000', async ({ request }) => {
    const { api } = await newUser(request, 'vud-paging');
    const ds = await seedSpendMonths(api);
    const body = kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters: [inMonth(ds.current)] });
    const all = descriptions(await underlyingAdHoc(api, body));
    expect(all).toEqual(['Salary', 'Bus', 'Uber', 'Zomato', 'Swiggy']);

    const pages = await Promise.all([0, 1, 2].map((page) => underlyingAdHoc(api, body, { page, size: 2 })));
    expect(pages.map((p) => tableOf(p).page)).toEqual([
      { number: 0, size: 2, totalElements: 5, totalPages: 3 },
      { number: 1, size: 2, totalElements: 5, totalPages: 3 },
      { number: 2, size: 2, totalElements: 5, totalPages: 3 },
    ]);
    expect(pages.flatMap(descriptions), 'pages concatenate to the whole listing').toEqual(all);
    expect(pages.every((p) => p.rowCount === 5 && p.value === -3200)).toBe(true);

    expect(tableOf(await underlyingAdHoc(api, body, { size: 5000 })).page.size, 'size is capped at 1000').toBe(1000);
    expect(tableOf(await underlyingAdHoc(api, body, { page: -1, size: 2 })).page.number, 'a negative page is page 0').toBe(0);
  });

  test('runtime sort orders the listing by a listed column and is echoed; anything else is a 400', async ({ request }) => {
    const { api } = await newUser(request, 'vud-sort');
    const ds = await seedSpendMonths(api);
    const body = kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters: [debits, inMonth(ds.current)] });

    const bySpend = await underlyingAdHoc(api, body, { sort: 'spend,asc' });
    expect(bySpend).toMatchObject({ sortKey: 'spend', sortDirection: 'asc', value: 1800 });
    expect(tableOf(bySpend).rows.map((r) => r.spend)).toEqual([100, 300, 700, 700]);

    const byDescription = await underlyingAdHoc(api, body, { sort: 'description,DESC' });
    expect(byDescription, 'the direction is case-insensitive and echoed in its JSON form').toMatchObject({
      sortKey: 'description',
      sortDirection: 'desc',
    });
    expect(descriptions(byDescription)).toEqual(['Zomato', 'Uber', 'Swiggy', 'Bus']);

    // Sorting pages: the order holds across pages.
    const page1 = await underlyingAdHoc(api, body, { sort: 'description,asc', page: 1, size: 2 });
    expect(descriptions(page1)).toEqual(['Uber', 'Zomato']);

    const bad = async (sort: string) => {
      const res = await api.POST('/api/v1/reports/underlying', { params: { query: { sort } }, body });
      expectStatus(res, 400);
      return (res.error as { message: string }).message;
    };
    expect(await bad('type,asc'), 'a datasource field that is not a listed column').toBe('Sort key is not an available column: type');
    expect(await bad('nope,desc')).toBe('Sort key is not an available column: nope');
    expect(await bad('spend')).toBe("Invalid sort 'spend': expected one '<column>,asc' or '<column>,desc' clause");
    expect(await bad('spend,up')).toBe("Invalid sort 'spend,up': expected one '<column>,asc' or '<column>,desc' clause");
    expect(await bad('spend,asc,date,desc')).toBe(
      "Invalid sort 'spend,asc,date,desc': expected one '<column>,asc' or '<column>,desc' clause"
    );
  });

  test('a KPI without a previous period refuses period=previous; an unknown period is a 400', async ({ request }) => {
    const { api } = await newUser(request, 'vud-no-previous');
    await seedSpendMonths(api);
    const noDate = kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters: [], comparison: PREVIOUS_PERIOD });
    const current = await underlyingAdHoc(api, noDate);
    expect(current).toMatchObject({ previousAvailable: false, previousRange: null, range: null });
    expect(current.value).toBe((await kpiFigures(api, noDate)).value);

    const res = await api.POST('/api/v1/reports/underlying', { params: { query: { period: 'previous' } }, body: noDate });
    expectStatus(res, 400);
    expect((res.error as { message: string }).message).toBe('This KPI has no previous period');

    const disabled = kpiBody('transactions', {
      measure: 'spend',
      aggregation: 'sum',
      filters: [inMonth(fixedMonth())],
      comparison: { enabled: false },
    });
    expect((await underlyingAdHoc(api, disabled)).previousAvailable, 'comparison off means no previous period').toBe(false);
    expectStatus(await api.POST('/api/v1/reports/underlying', { params: { query: { period: 'previous' } }, body: disabled }), 400);

    expectStatus(await api.POST('/api/v1/reports/underlying', { params: { query: { period: 'last' } }, body: noDate }), 400);
  });

  test('a billing-cycle KPI lists this cycle and the statement before it', async ({ request }) => {
    const { api } = await newUser(request, 'vud-cycle');
    const card = await createCreditCard(api, { name: 'VUD Cycle Card', last4: '8473' });
    // The statement closes 3 days ago with two lines: 4500 (20 days ago) and 1500 (10 days ago).
    await ingestCardStatement(api, card.id, '8473');
    await createTransaction(api, card.id, { amount: -700, date: istToday(-1), description: 'Cycle spend' });
    const body = kpiBody('transactions', {
      measure: 'amount',
      aggregation: 'sum',
      filters: [
        { field: 'account', operator: 'is', value: 'VUD Cycle Card' },
        { field: 'date', operator: 'this_billing_cycle' },
      ],
      comparison: PREVIOUS_PERIOD,
    });
    const kpi = await kpiFigures(api, body);
    expect(kpi.value).toBe(-700);
    expect(kpi.previousValue).toBe(-6000);

    const current = await underlyingAdHoc(api, body);
    expect(current).toMatchObject({ value: kpi.value, rowCount: 1, previousAvailable: true });
    expect(current.range?.from).toBe(istToday(-2));
    expect(current.previousRange).toEqual({ from: istToday(-32), to: istToday(-3) });
    expect(current.filters.map((f) => f.text)).toEqual(['is VUD Cycle Card', 'This billing cycle']);
    expect(descriptions(current)).toEqual(['Cycle spend']);

    const previous = await underlyingAdHoc(api, body, { period: 'previous' });
    expect(previous).toMatchObject({ value: kpi.previousValue, rowCount: 2, range: { from: istToday(-32), to: istToday(-3) } });
    expect(tableOf(previous).rows.map((r) => [r.date, r.amount])).toEqual([
      [istToday(-10), -1500],
      [istToday(-20), -4500],
    ]);
    expect(previous.filters.map((f) => f.text)).toEqual(['is VUD Cycle Card', 'Previous billing cycle']);
  });

  test('only KPI definitions have underlying data', async ({ request }) => {
    const { api } = await newUser(request, 'vud-non-kpi');
    const table = await createReport(api, {
      name: 'VUD table',
      type: 'TABLE',
      datasource: 'transactions',
      definition: { mode: 'raw', columns: ['date', 'amount'], filters: [] },
    } as never);
    const saved = await api.POST('/api/v1/reports/{id}/underlying', { params: { path: { id: table.id } } });
    expectStatus(saved, 400);
    expect((saved.error as { message: string }).message).toBe('Underlying data is only available for KPI reports');
    expect((await underlyingSavedCsv(api, table.id)).status).toBe(400);

    const chartBody = {
      type: 'CHART',
      datasource: 'transactions',
      definition: { chartType: 'bar', dimension: { field: 'category' }, measure: { field: 'amount', aggregation: 'sum' }, filters: [] },
    } as never;
    expectStatus(await api.POST('/api/v1/reports/underlying', { body: chartBody }), 400);
    expect((await underlyingAdHocCsv(api, chartBody)).status).toBe(400);

    // The Upcoming built-in is a table template.
    expectStatus(await api.POST('/api/v1/dashboards/builtins/{key}/underlying', { params: { path: { key: 'upcoming' } } }), 400);
    expect((await underlyingBuiltinCsv(api, 'upcoming')).status).toBe(400);
  });
});

test.describe('KPI underlying data: computed datasources (@api)', () => {
  test('lendings: value equals the KPI for both periods, with the fallback columns', async ({ request }) => {
    const { api } = await newUser(request, 'vud-lendings');
    const current = fixedMonth();
    const previous = monthBefore(current);
    const asha = await createCounterparty(api, { name: 'VUD Asha' });
    const ravi = await createCounterparty(api, { name: 'VUD Ravi' });
    const lent = await addLending(api, { counterpartyId: asha.id, direction: 'lent', amount: 5000, entryDate: dayOf(current, 4) });
    const borrowed = await addLending(api, { counterpartyId: ravi.id, direction: 'borrowed', amount: 2000, entryDate: dayOf(current, 9) });
    const earlier = await addLending(api, { counterpartyId: asha.id, direction: 'lent', amount: 1000, entryDate: dayOf(previous, 15) });

    const body = kpiBody('lendings', {
      measure: 'signedAmount',
      aggregation: 'sum',
      filters: [inMonth(current, 'entryDate')],
      comparison: PREVIOUS_PERIOD,
    });
    const kpi = await kpiFigures(api, body);
    expect(kpi.value).toBe(3000);
    expect(kpi.previousValue).toBe(1000);

    const now = await underlyingAdHoc(api, body);
    expect(now).toMatchObject({
      datasource: 'lendings',
      value: 3000,
      rowCount: 2,
      measureLabel: 'Signed Amount',
      rowAction: null,
      groupField: null,
      summaryLines: [],
      notCounted: [],
      range: { from: current.from, to: current.to },
      previousRange: { from: previous.from, to: previous.to },
    });
    expect(now.filters).toEqual([
      {
        field: 'entryDate',
        fieldLabel: 'Entry Date',
        operator: 'between',
        text: `Between ${ddmmyyyy(current.from)} and ${ddmmyyyy(current.to)}`,
      },
    ]);
    // No identifying-columns hook: the first date field, up to three table dimensions (never id), then the measure.
    expect(tableOf(now).columns.map((c) => c.key)).toEqual(['entryDate', 'counterpartyId', 'counterpartyName', 'direction', 'signedAmount']);
    expect(tableOf(now).rows).toEqual([
      { id: borrowed.id, entryDate: dayOf(current, 9), counterpartyId: ravi.id, counterpartyName: 'VUD Ravi', direction: 'borrowed', signedAmount: -2000 },
      { id: lent.id, entryDate: dayOf(current, 4), counterpartyId: asha.id, counterpartyName: 'VUD Asha', direction: 'lent', signedAmount: 5000 },
    ]);

    const before = await underlyingAdHoc(api, body, { period: 'previous' });
    expect(before).toMatchObject({ period: 'previous', value: kpi.previousValue, rowCount: 1 });
    expect(tableOf(before).rows.map((r) => r.id)).toEqual([earlier.id]);

    // In-memory MAX lists its winner only; runtime sort applies to in-memory rows too.
    const max = await underlyingAdHoc(api, kpiBody('lendings', { measure: 'amount', aggregation: 'max', filters: [] }));
    expect(max).toMatchObject({ value: 5000, winnerOnly: true, rowCount: 1 });
    const sorted = await underlyingAdHoc(api, kpiBody('lendings', { measure: 'amount', aggregation: 'sum', filters: [] }), {
      sort: 'amount,asc',
    });
    expect(tableOf(sorted).rows.map((r) => r.amount)).toEqual([1000, 2000, 5000]);
    expect(sorted).toMatchObject({ sortKey: 'amount', sortDirection: 'asc', value: 8000 });
  });

  test('id-backed filters are shown by their labels', async ({ request }) => {
    const { api } = await newUser(request, 'vud-id-chips');
    const month = fixedMonth();
    const card = await createRewardCard(api, { name: 'VUD Chip Card' });
    const rule = await createRewardRule(api, card.account.id, { name: 'Cashback 2%', percentRate: 2 });
    await spend(api, card.account.id, { amount: 1000, date: dayOf(month, 6) });

    const body = kpiBody('reward_earnings', {
      measure: 'valueInr',
      aggregation: 'sum',
      filters: [
        { field: 'rule', operator: 'is', value: rule.id },
        { field: 'card', operator: 'in', value: [card.account.id] },
      ],
    });
    const res = await underlyingAdHoc(api, body);
    expect(res.filters.map((f) => f.text)).toEqual(['is Cashback 2%', 'in VUD Chip Card']);
    expect(res.value).toBe((await kpiFigures(api, body)).value);
    expect(res.value).toBe(20);
  });

  test('net_worth: the built-in lists counted rows by side with Assets/Liabilities and what is not counted', async ({ request }) => {
    const { api } = await newUser(request, 'vud-networth');
    const bank = await createBankAccount(api, { name: 'NWU Bank', openingBalance: 12000 });
    const wallet = await createGenericAccount(api, { name: 'NWU Wallet' });
    await createTransaction(api, wallet.id, { amount: 300, description: 'NWU top-up' });
    const card = await createCreditCard(api, { name: 'NWU Card', last4: '4401' });
    await createTransaction(api, card.id, { amount: -2000, description: 'NWU card spend' });
    const asha = await createCounterparty(api, { name: 'NWU Asha' });
    await addLending(api, { counterpartyId: asha.id, direction: 'lent', amount: 5000, entryDate: istToday(-3) });
    const hidden = await createBankAccount(api, { name: 'NWU Hidden', openingBalance: 777, excludeFromNetAsset: true });
    const closed = await createBankAccount(api, { name: 'NWU Closed', openingBalance: 400 });
    expectStatus(
      await api.POST('/api/v1/accounts/{id}/close', { params: { path: { id: closed.id } }, body: { closedOn: istToday(-1) } }),
      200
    );

    const widget = await api.POST('/api/v1/dashboards/builtins/{key}/data', { params: { path: { key: 'net_worth' } } });
    expectStatus(widget, 200);
    const widgetValue = (widget.data as unknown as { value: number }).value;
    expect(widgetValue).toBe(15300); // 12000 + 300 + 5000 - 2000

    const res = await underlyingBuiltin(api, 'net_worth');
    expect(res).toMatchObject({
      datasource: 'net_worth',
      measure: 'signedValue',
      value: widgetValue,
      rowCount: 4,
      winnerOnly: false,
      rowAction: 'breakdown',
      groupField: 'side',
      sortKey: null,
      filters: [],
      range: null,
      previousAvailable: false,
    });
    expect(res.summaryLines).toEqual([
      { label: 'Assets', value: 17300, format: 'currency' },
      { label: 'Liabilities', value: 2000, format: 'currency' },
    ]);
    expect([...res.notCounted].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { id: closed.id, name: 'NWU Closed', kind: 'bank_account', reason: 'closed', reasonLabel: `Closed on ${ddmmyyyy(istToday(-1))}`, value: 400 },
      { id: hidden.id, name: 'NWU Hidden', kind: 'bank_account', reason: 'excluded', reasonLabel: 'Excluded from net worth', value: 777 },
    ]);
    const table = tableOf(res);
    expect(table.columns.map((c) => c.key)).toEqual(['name', 'kind', 'side', 'signedValue']);
    // Kind and side carry their display labels; the rows below keep the stored values.
    expect(table.columns.map((c) => c.valueLabels ?? null)).toEqual([null, NET_WORTH_KIND_LABELS, NET_WORTH_SIDE_LABELS, null]);
    // Assets first, largest first; then liabilities.
    expect(table.rows).toEqual([
      { id: bank.id, name: 'NWU Bank', kind: 'bank_account', side: 'asset', signedValue: 12000 },
      { id: asha.id, name: 'NWU Asha', kind: 'lending', side: 'asset', signedValue: 5000 },
      { id: wallet.id, name: 'NWU Wallet', kind: 'generic', side: 'asset', signedValue: 300 },
      { id: card.id, name: 'NWU Card', kind: 'credit_card', side: 'liability', signedValue: -2000 },
    ]);

    // A user sort replaces the grouped order and is echoed (the client stops grouping on it).
    const sorted = await underlyingBuiltin(api, 'net_worth', undefined, { sort: 'signedValue,asc' });
    expect(sorted).toMatchObject({ sortKey: 'signedValue', sortDirection: 'asc', groupField: 'side' });
    expect(tableOf(sorted).rows.map((r) => r.name)).toEqual(['NWU Card', 'NWU Wallet', 'NWU Asha', 'NWU Bank']);
    // Summary lines cover every listed row, not just the page.
    const firstPage = await underlyingBuiltin(api, 'net_worth', {}, { size: 1 });
    expect(tableOf(firstPage).rows).toHaveLength(1);
    expect(firstPage.summaryLines).toEqual(res.summaryLines);

    const builtinPrevious = await api.POST('/api/v1/dashboards/builtins/{key}/underlying', {
      params: { path: { key: 'net_worth' }, query: { period: 'previous' } },
    });
    expectStatus(builtinPrevious, 400);

    // Ad hoc, with a filter: the listed rows and their value follow it.
    const liabilities = await underlyingAdHoc(
      api,
      kpiBody('net_worth', { measure: 'value', aggregation: 'sum', filters: [{ field: 'side', operator: 'is', value: 'liability' }] })
    );
    expect(liabilities).toMatchObject({ value: 2000, rowCount: 1 });
    // Chips print a static enum value by its label.
    expect(liabilities.filters.map((f) => f.text)).toEqual(['is Liability']);
    expect(liabilities.summaryLines).toEqual([
      { label: 'Assets', value: 0, format: 'currency' },
      { label: 'Liabilities', value: 2000, format: 'currency' },
    ]);
    const kinds = await underlyingAdHoc(
      api,
      kpiBody('net_worth', {
        measure: 'value',
        aggregation: 'sum',
        filters: [{ field: 'kind', operator: 'in', value: ['bank_account', 'generic'] }],
      })
    );
    expect(kinds.filters.map((f) => [f.fieldLabel, f.text])).toEqual([['Kind', 'in Bank account, Wallet/Cash']]);
    expect(tableOf(kinds).rows.map((r) => r.kind).sort()).toEqual(['bank_account', 'generic']);

    // The CSV prints every enum cell by its label.
    const file = await underlyingBuiltinCsv(api, 'net_worth');
    expect(csvLines(file)).toEqual([
      'Name,Kind,Side,Net value',
      'NWU Bank,Bank account,Asset,12000.00',
      'NWU Asha,Lending,Asset,5000.00',
      'NWU Wallet,Wallet/Cash,Asset,300.00',
      'NWU Card,Credit card,Liability,-2000.00',
    ]);
  });

  test('in-memory KPIs compare with an empty previous period exactly like SQL ones', async ({ request }) => {
    const { api } = await newUser(request, 'vud-empty-previous');
    const current = fixedMonth();
    // The same two figures now, and nothing the month before, in a SQL (transactions) and an
    // in-memory (lendings) datasource.
    const bank = await createBankAccount(api, { name: 'EP Bank', openingBalance: 0 });
    await createTransaction(api, bank.id, { amount: -5000, date: dayOf(current, 4), description: 'EP big' });
    await createTransaction(api, bank.id, { amount: -2000, date: dayOf(current, 9), description: 'EP small' });
    const asha = await createCounterparty(api, { name: 'EP Asha' });
    await addLending(api, { counterpartyId: asha.id, direction: 'lent', amount: 5000, entryDate: dayOf(current, 4) });
    await addLending(api, { counterpartyId: asha.id, direction: 'borrowed', amount: 2000, entryDate: dayOf(current, 9) });

    const expected: Record<string, number> = { sum: 7000, avg: 3500, min: 2000, max: 5000, count: 2 };
    for (const aggregation of ['sum', 'avg', 'min', 'max', 'count']) {
      const sql = await kpiFigures(
        api,
        kpiBody('transactions', { measure: 'spend', aggregation, filters: [debits, inMonth(current)], comparison: PREVIOUS_PERIOD })
      );
      const lendingsBody = kpiBody('lendings', {
        measure: 'amount',
        aggregation,
        filters: [inMonth(current, 'entryDate')],
        comparison: PREVIOUS_PERIOD,
      });
      const inMemory = await kpiFigures(api, lendingsBody);
      expect(Number(inMemory.value), aggregation).toBe(expected[aggregation]);
      expect(inMemory.value, aggregation).toEqual(sql.value);
      expect(inMemory.comparison, `${aggregation}: the comparison block is identical`).toEqual(sql.comparison);
      // Nothing before: no percentage, and the change is the whole current value.
      expect(inMemory.comparison, aggregation).toMatchObject({ changePercent: null, direction: 'up' });
      expect(Number((inMemory.comparison as { change: number }).change), aggregation).toBe(expected[aggregation]);
      if (aggregation === 'sum' || aggregation === 'count') {
        // A SUM or COUNT of nothing is 0 on both paths.
        expect(Number(inMemory.previousValue), `${aggregation}: no previous rows, previous value 0`).toBe(0);
        expect(inMemory.previousValue, aggregation).toEqual(sql.previousValue);
      } else {
        expect(inMemory.previousValue, `${aggregation}: no previous rows, no previous value`).toBeNull();
      }
      // Its underlying previous period lists nothing.
      const previous = await underlyingAdHoc(api, lendingsBody, { period: 'previous' });
      expect(previous, aggregation).toMatchObject({ period: 'previous', rowCount: 0 });
      expect(tableOf(previous).rows).toEqual([]);
    }
  });
});

test.describe('Category-filtered transactions count each transaction once (@api)', () => {
  test('KPI, underlying rows, CSV, raw table and chart agree on unique rows', async ({ request }) => {
    const { api } = await newUser(request, 'vud-category-once');
    const month = fixedMonth();
    const bank = await createBankAccount(api, { name: 'CO Bank', openingBalance: 0 });
    const tag = Date.now().toString(36);
    const food = await createCategory(api, `CO Food ${tag}`);
    const travel = await createCategory(api, `CO Travel ${tag}`);
    // Combo sits in both filtered categories: a join would count it twice.
    const combo = await createTransaction(api, bank.id, {
      amount: -500,
      date: dayOf(month, 5),
      description: 'CO Combo',
      categoryIds: [food.id, travel.id],
    });
    const single = await createTransaction(api, bank.id, {
      amount: -200,
      date: dayOf(month, 6),
      description: 'CO Single',
      categoryIds: [food.id],
    });
    await createTransaction(api, bank.id, { amount: -900, date: dayOf(month, 7), description: 'CO Other' });
    const filters: Filter[] = [debits, inMonth(month), { field: 'category', operator: 'in', value: [food.name, travel.name] }];

    for (const [aggregation, value] of [
      ['sum', 700],
      ['count', 2],
      ['avg', 350],
    ] as const) {
      const body = kpiBody('transactions', { measure: 'spend', aggregation, filters });
      const kpi = await kpiFigures(api, body);
      expect(Number(kpi.value), `${aggregation} counts each transaction once`).toBe(value);
      const res = await underlyingAdHoc(api, body);
      expect(res.value, aggregation).toBe(kpi.value);
      expect(res.rowCount, aggregation).toBe(2);
      const ids = tableOf(res).rows.map((r) => String(r.id));
      expect(ids.sort(), `${aggregation}: unique rows`).toEqual([combo.id, single.id].sort());
      if (aggregation === 'sum') {
        const sumOfRows = tableOf(res).rows.reduce((acc, r) => acc + Number(r.spend), 0);
        expect(sumOfRows, 'the value is the sum of the unique rows').toBe(700);
      }
    }

    const csv = await underlyingAdHocCsv(api, kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters }));
    const lines = csvLines(csv).slice(1);
    expect(lines).toHaveLength(2);
    expect(lines.filter((l) => l.includes('CO Combo'))).toHaveLength(1);

    const table = await api.POST('/api/v1/reports/data', {
      body: {
        type: 'TABLE',
        datasource: 'transactions',
        definition: { mode: 'raw', columns: ['description', 'spend'], filters },
      } as never,
    });
    expectStatus(table, 200);
    const tableRows = (table.data as unknown as { rows: Array<{ description: string }> }).rows;
    expect(tableRows.map((r) => r.description).sort()).toEqual(['CO Combo', 'CO Single']);

    const chart = await api.POST('/api/v1/reports/data', {
      body: {
        type: 'CHART',
        datasource: 'transactions',
        definition: { chartType: 'bar', dimension: { field: 'account' }, measure: { field: 'spend', aggregation: 'sum' }, filters },
      } as never,
    });
    expectStatus(chart, 200);
    const chartData = chart.data as unknown as { categories: string[]; series: Array<{ data: number[] }>; meta: { rowCount: number } };
    expect(chartData.categories).toEqual(['CO Bank']);
    expect(Number(chartData.series[0].data[0])).toBe(700);
    expect(chartData.meta.rowCount).toBe(2);
  });
});

test.describe('net_worth enum labels (@api)', () => {
  test('kind and side carry display labels in the catalog, raw tables, pivots and charts; values stay stored', async ({ request }) => {
    const { api } = await newUser(request, 'vud-nw-labels');
    await createBankAccount(api, { name: 'NWL Bank', openingBalance: 1000 });
    const card = await createCreditCard(api, { name: 'NWL Card', last4: '4402' });
    await createTransaction(api, card.id, { amount: -300, description: 'NWL spend' });

    const catalog = await api.GET('/api/v1/report/datasource');
    expectStatus(catalog, 200);
    const nw = (catalog.data as unknown as { datasources: Array<{ name: string; fields: Array<Record<string, unknown>> }> }).datasources.find(
      (d) => d.name === 'net_worth'
    )!;
    const field = (name: string) => nw.fields.find((f) => f.name === name)!;
    expect(field('kind').valueLabels).toEqual(NET_WORTH_KIND_LABELS);
    expect(field('side').valueLabels).toEqual(NET_WORTH_SIDE_LABELS);
    expect(field('kind').values).toEqual(expect.arrayContaining(Object.keys(NET_WORTH_KIND_LABELS)));
    expect(field('name').valueLabels ?? null).toBeNull();

    const run = async (type: string, definition: Record<string, unknown>) => {
      const res = await api.POST('/api/v1/reports/data', { body: { type, datasource: 'net_worth', definition } as never });
      expectStatus(res, 200);
      return res.data as unknown as Record<string, unknown>;
    };

    const raw = await run('TABLE', { mode: 'raw', columns: ['name', 'kind', 'side', 'value'], filters: [] });
    const columns = raw.columns as Array<{ key: string; valueLabels?: Record<string, string> }>;
    expect(columns.map((c) => c.valueLabels ?? null)).toEqual([null, NET_WORTH_KIND_LABELS, NET_WORTH_SIDE_LABELS, null]);
    const rows = raw.rows as Array<{ name: string; kind: string; side: string }>;
    expect(rows.map((r) => [r.name, r.kind, r.side]).sort()).toEqual([
      ['NWL Bank', 'bank_account', 'asset'],
      ['NWL Card', 'credit_card', 'liability'],
    ]);

    const pivot = await run('TABLE', {
      mode: 'aggregated',
      rows: [{ field: 'kind' }],
      columns: [{ field: 'side' }],
      measures: [{ field: 'value', aggregation: 'sum' }],
      filters: [],
    });
    expect((pivot.rowDimensions as Array<{ valueLabels?: unknown }>)[0].valueLabels).toEqual(NET_WORTH_KIND_LABELS);
    expect((pivot.columnDimensions as Array<{ valueLabels?: unknown }>)[0].valueLabels).toEqual(NET_WORTH_SIDE_LABELS);
    expect((pivot.rows as Array<{ values: { kind: string } }>).map((r) => r.values.kind).sort()).toEqual(['bank_account', 'credit_card']);

    const chart = await run('CHART', {
      chartType: 'bar',
      dimension: { field: 'kind' },
      series: { field: 'side' },
      measure: { field: 'value', aggregation: 'sum' },
      filters: [],
    });
    expect(chart.valueLabels).toEqual(NET_WORTH_KIND_LABELS);
    expect(chart.seriesValueLabels).toEqual(NET_WORTH_SIDE_LABELS);
    expect([...(chart.categories as string[])].sort()).toEqual(['bank_account', 'credit_card']);
    expect((chart.series as Array<{ name: string }>).map((s) => s.name).sort()).toEqual(['asset', 'liability']);

    // A field without labels omits them.
    const byName = await run('CHART', {
      chartType: 'bar',
      dimension: { field: 'name' },
      measure: { field: 'value', aggregation: 'sum' },
      filters: [],
    });
    expect(byName.valueLabels ?? null).toBeNull();
  });
});

test.describe('KPI underlying data: CSV (@api)', () => {
  test('the CSV holds every row in the listing order, with a BOM, CRLF line ends and spreadsheet-safe cells', async ({ request }) => {
    const { api } = await newUser(request, 'vud-csv');
    const month = fixedMonth();
    const bank = await createBankAccount(api, { name: 'CSV Bank', openingBalance: 0 });
    await createTransaction(api, bank.id, { amount: -1234.5, date: dayOf(month, 2), description: '=SUM(A1:A9)' });
    await createTransaction(api, bank.id, { amount: -20, date: dayOf(month, 3), description: 'Zomato, food' });
    await createTransaction(api, bank.id, { amount: -7, date: dayOf(month, 4), description: 'Say "hi"' });
    await createTransaction(api, bank.id, { amount: -0.1, date: dayOf(month, 5), description: '+91 call' });
    await createTransaction(api, bank.id, { amount: -1, date: dayOf(month, 6), description: '@handle' });
    const body = kpiBody('transactions', { measure: 'amount', aggregation: 'sum', filters: [inMonth(month)] });

    const csv = await underlyingAdHocCsv(api, body);
    expect(csv.status).toBe(200);
    expect(csv.contentType).toBe('text/csv;charset=UTF-8');
    expect(csv.disposition).toBe('attachment; filename="underlying.csv"');
    expect(startsWithBom(csv), 'UTF-8 byte-order mark').toBe(true);
    expect(csv.body.endsWith('\r\n')).toBe(true);
    expect(csv.body.replace(/\r\n/g, ''), 'every line ends in CRLF').not.toMatch(/[\r\n]/);
    const d = (day: number) => ddmmyyyy(dayOf(month, day));
    expect(csvLines(csv)).toEqual([
      'Date,Description,Account,Category,Amount',
      `${d(6)},'@handle,CSV Bank,,-1.00`,
      `${d(5)},'+91 call,CSV Bank,,-0.10`,
      `${d(4)},"Say ""hi""",CSV Bank,,-7.00`,
      `${d(3)},"Zomato, food",CSV Bank,,-20.00`,
      `${d(2)},'=SUM(A1:A9),CSV Bank,,-1234.50`,
    ]);

    // The runtime sort orders the file too.
    const sorted = await underlyingAdHocCsv(api, body, { sort: 'amount,asc' });
    expect(csvLines(sorted).slice(1).map((l) => l.split(',').pop())).toEqual(['-1234.50', '-20.00', '-7.00', '-1.00', '-0.10']);

    // A MAX export holds just its winner.
    const max = await underlyingAdHocCsv(api, kpiBody('transactions', { measure: 'amount', aggregation: 'max', filters: [inMonth(month)] }));
    expect(csvLines(max)).toEqual(['Date,Description,Account,Category,Amount', `${d(5)},'+91 call,CSV Bank,,-0.10`]);

    // Errors are JSON 400s, not a partial file.
    const badSort = await api.POST('/api/v1/reports/underlying/csv', { params: { query: { sort: 'type,asc' } }, body });
    expectStatus(badSort, 400);
    expect((badSort.error as { code: string }).code).toBe('VALIDATION_ERROR');
    const noDate = kpiBody('transactions', { measure: 'amount', aggregation: 'sum', filters: [] });
    const noPrevious = await underlyingAdHocCsv(api, noDate, { period: 'previous' });
    expect(noPrevious.status, 'a KPI without a date filter has no previous period').toBe(400);
    expect(noPrevious.contentType).toContain('application/json');

    // A date-filtered KPI with no comparison block compares by default: its previous month exports (empty here).
    const previous = await underlyingAdHocCsv(api, body, { period: 'previous' });
    expect(previous.status).toBe(200);
    expect(csvLines(previous)).toEqual(['Date,Description,Account,Category,Amount']);
  });

  test('saved and built-in KPIs export the same rows as their pages, for either period', async ({ request }) => {
    const { api } = await newUser(request, 'vud-csv-saved');
    const ds = await seedSpendMonths(api);
    const report = await createReport(api, {
      name: 'VUD csv saved',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [debits, inMonth(ds.current)], comparison: PREVIOUS_PERIOD },
    } as never);
    const travel = ds.travel.name;
    const food = ds.food.name;
    const bank = ds.account.name;
    const d = (m: { year: number; month: number }, day: number) => ddmmyyyy(dayOf(m, day));

    const current = await underlyingSavedCsv(api, report.id);
    expect(current.status).toBe(200);
    expect(current.disposition).toBe('attachment; filename="underlying.csv"');
    expect(csvLines(current)).toEqual([
      'Date,Description,Account,Category,Spend',
      `${d(ds.current, 18)},Bus,${bank},${travel},100.00`,
      `${d(ds.current, 12)},Uber,${bank},${travel},300.00`,
      `${d(ds.current, 8)},Zomato,${bank},${food},700.00`,
      `${d(ds.current, 3)},Swiggy,${bank},${food},700.00`,
    ]);
    const previous = await underlyingSavedCsv(api, report.id, { period: 'previous', sort: 'description,asc' });
    expect(csvLines(previous)).toEqual([
      'Date,Description,Account,Category,Spend',
      `${d(ds.previous, 4)},Cafe,${bank},${food},50.00`,
      `${d(ds.previous, 21)},Taxi,${bank},${travel},400.00`,
      `${d(ds.previous, 9)},Tea,${bank},${food},50.00`,
    ]);

    const nw = await underlyingBuiltinCsv(api, 'net_worth');
    expect(nw.status).toBe(200);
    expect(nw.contentType).toBe('text/csv;charset=UTF-8');
    expect(csvLines(nw)).toEqual(['Name,Kind,Side,Net value', `${bank},Bank account,Asset,12700.00`]);
    expect(csvLines(await underlyingBuiltinCsv(api, 'net_worth', {}, { sort: 'name,asc' }))).toEqual(csvLines(nw));
  });

  test('an empty listing exports just the header', async ({ request }) => {
    const { api } = await newUser(request, 'vud-csv-empty');
    const csv = await underlyingAdHocCsv(api, kpiBody('transactions', { measure: 'amount', aggregation: 'sum', filters: [] }));
    expect(csv.status).toBe(200);
    expect(csvLines(csv)).toEqual(['Date,Description,Account,Category,Amount']);
  });
});

test.describe('KPI underlying data: tenancy (@api)', () => {
  test("another user's saved KPI is refused like running it, and their rows never appear", async ({ request }) => {
    const a = await newUser(request, 'vud-tenant-a');
    const b = await newUser(request, 'vud-tenant-b');
    const ds = await seedSpendMonths(a.api);
    const report = await createReport(a.api, {
      name: 'VUD tenancy',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [inMonth(ds.current)] },
    } as never);

    // Ownership is checked as for POST /reports/{id}/data, which answers a foreign report with this 400.
    const run = await b.api.POST('/api/v1/reports/{id}/data', { params: { path: { id: report.id } } });
    expectStatus(run, 400);
    const foreign = await b.api.POST('/api/v1/reports/{id}/underlying', { params: { path: { id: report.id } } });
    expectStatus(foreign, 400);
    expect(foreign.error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'You do not have permission to access this report.' });
    const foreignCsv = await underlyingSavedCsv(b.api, report.id);
    expect(foreignCsv.status).toBe(400);
    expect(foreignCsv.body).not.toContain('Swiggy');
    expectStatus(await b.api.POST('/api/v1/reports/{id}/underlying', { params: { path: { id: randomUUID() } } }), 404);

    const sameDefinition = kpiBody('transactions', { measure: 'spend', aggregation: 'sum', filters: [inMonth(ds.current)] });
    const bView = await underlyingAdHoc(b.api, sameDefinition);
    expect(bView).toMatchObject({ value: 0, rowCount: 0 });
    expect(csvLines(await underlyingAdHocCsv(b.api, sameDefinition))).toHaveLength(1);
    expect(tableOf(await underlyingBuiltin(b.api, 'net_worth')).rows).toEqual([]);
    expect((await underlyingAdHoc(a.api, sameDefinition)).rowCount).toBe(5);
  });
});

test.describe('Transaction by id (@api)', () => {
  test('GET /transactions/{id} returns the row as the search lists it; foreign and unknown ids are 404', async ({ request }) => {
    const a = await newUser(request, 'txn-by-id-a');
    const b = await newUser(request, 'txn-by-id-b');
    const ds = await seedSpendMonths(a.api);

    // The id a KPI's underlying row carries opens the transaction.
    const listed = await underlyingAdHoc(a.api, kpiBody('transactions', { measure: 'spend', aggregation: 'max', filters: [debits, inMonth(ds.previous)] }));
    const rowId = String(tableOf(listed).rows[0].id);
    expect(rowId).toBe(ds.ids.Taxi);

    const res = await a.api.GET('/api/v1/transactions/{id}', { params: { path: { id: rowId } } });
    expectStatus(res, 200);
    const fromSearch = (await searchAll(a.api)).find((t) => t.id === rowId);
    // Same mapping as the list row; the running balance is a list-only figure.
    expect(res.data).toEqual({ ...fromSearch, balance: null });
    expect(res.data).toMatchObject({ id: rowId, description: 'Taxi', accountId: ds.account.id });

    expectStatus(await b.api.GET('/api/v1/transactions/{id}', { params: { path: { id: rowId } } }), 404);
    expectStatus(await a.api.GET('/api/v1/transactions/{id}', { params: { path: { id: randomUUID() } } }), 404);
  });
});
