import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { addLending, createCounterparty } from '../fixtures/seed/loans';
import { loanWithFirstEmiIn } from '../fixtures/seed/nav';
import { createReport } from '../fixtures/seed/reports';
import { createTransaction } from '../fixtures/seed/transactions';
import { inMonth, type RawTable, seedSpendMonths } from '../fixtures/seed/underlying';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

type Pivot = { rows: Array<Record<string, unknown>> };
type PivotRow = { key: string; values: Record<string, unknown>; cells: Record<string, Record<string, number | null>> };

async function runSaved(api: ApiClient, id: string, sort?: string, page?: number, size?: number) {
  return api.POST('/api/v1/reports/{id}/data', { params: { path: { id }, query: { sort, page, size } } });
}

async function runAdHoc(api: ApiClient, body: unknown, sort?: string) {
  return api.POST('/api/v1/reports/data', { params: { query: { sort } }, body: body as never });
}

async function runBuiltin(api: ApiClient, key: string, sort?: string, params?: unknown) {
  return api.POST('/api/v1/dashboards/builtins/{key}/data', {
    params: { path: { key }, query: { sort } },
    body: params === undefined ? undefined : ({ params } as never),
  });
}

function rowsOf(res: { data?: unknown }): Array<Record<string, unknown>> {
  return (res.data as unknown as Pivot).rows;
}

/** An aggregated table's rows as [row-dimension value, measure value of the single (no column dimension) cell]. */
function pivotRows(res: { data?: unknown }, dimension: string, measure: string): Array<[unknown, unknown]> {
  return (res.data as unknown as { rows: PivotRow[] }).rows.map((r) => [r.values[dimension], r.cells[''][measure]]);
}

function message(res: { error?: unknown }): string {
  return (res.error as { message: string }).message;
}

const MALFORMED = "Invalid sort 'amount': expected one '<column>,asc' or '<column>,desc' clause";

test.describe('Runtime header sort on report runs (@api)', () => {
  test('a saved raw table: the sort param replaces the saved order for that run only', async ({ request }) => {
    const { api } = await newUser(request, 'sort-saved-raw');
    const ds = await seedSpendMonths(api);
    const report = await createReport(api, {
      name: 'Sorted table',
      type: 'TABLE',
      datasource: 'transactions',
      definition: {
        mode: 'raw',
        columns: ['date', 'description', 'amount'],
        filters: [inMonth(ds.current)],
        sort: [{ key: 'date', direction: 'desc' }],
      },
    } as never);
    const descriptions = (res: { data?: unknown }) => rowsOf(res).map((r) => r.description);

    const saved = await runSaved(api, report.id);
    expectStatus(saved, 200);
    expect(descriptions(saved)).toEqual(['Salary', 'Bus', 'Uber', 'Zomato', 'Swiggy']);

    const byAmount = await runSaved(api, report.id, 'amount,asc');
    expectStatus(byAmount, 200);
    expect(rowsOf(byAmount).map((r) => r.amount)).toEqual([-700, -700, -300, -100, 5000]);
    const byDescription = await runSaved(api, report.id, 'description,DESC');
    expect(descriptions(byDescription), 'direction is case-insensitive').toEqual(['Zomato', 'Uber', 'Swiggy', 'Salary', 'Bus']);
    // Paging follows the runtime order.
    const page1 = await runSaved(api, report.id, 'description,asc', 1, 2);
    expect(descriptions(page1)).toEqual(['Swiggy', 'Uber']);
    expect((page1.data as unknown as RawTable).page).toEqual({ number: 1, size: 2, totalElements: 5, totalPages: 3 });

    // Never persisted: the saved report and its default run are unchanged.
    expect(descriptions(await runSaved(api, report.id))).toEqual(['Salary', 'Bus', 'Uber', 'Zomato', 'Swiggy']);
    const stored = await api.GET('/api/v1/reports/{id}', { params: { path: { id: report.id } } });
    expect((stored.data!.definition as { sort: unknown }).sort).toEqual([{ key: 'date', direction: 'desc' }]);

    const blank = await runSaved(api, report.id, '');
    expect(descriptions(blank), 'a blank sort is the saved order').toEqual(['Salary', 'Bus', 'Uber', 'Zomato', 'Swiggy']);

    const notColumn = await runSaved(api, report.id, 'category,asc');
    expectStatus(notColumn, 400);
    expect(message(notColumn)).toBe('Sort key is not an available column: category');
    const malformed = await runSaved(api, report.id, 'amount');
    expectStatus(malformed, 400);
    expect(message(malformed)).toBe(MALFORMED);
  });

  test('an ad-hoc SQL pivot sorts by a row dimension, or by a measure only without column dimensions', async ({ request }) => {
    const { api } = await newUser(request, 'sort-sql-pivot');
    const ds = await seedSpendMonths(api);
    const pivot = (columns: Array<{ field: string }> = []) => ({
      type: 'TABLE',
      datasource: 'transactions',
      definition: {
        mode: 'aggregated',
        rows: [{ field: 'description' }],
        columns,
        measures: [{ field: 'spend', aggregation: 'sum' }],
        filters: [inMonth(ds.current)],
      },
    });
    const keys = (res: { data?: unknown }) => (res.data as unknown as { rows: PivotRow[] }).rows.map((r) => r.values.description);

    const byMeasure = await runAdHoc(api, pivot(), 'spend_sum,desc');
    expectStatus(byMeasure, 200);
    // Swiggy and Zomato tie at 700; the default ordering breaks the tie.
    expect(pivotRows(byMeasure, 'description', 'spend_sum')).toEqual([
      ['Swiggy', 700],
      ['Zomato', 700],
      ['Uber', 300],
      ['Bus', 100],
      ['Salary', -5000],
    ]);
    expect(keys(await runAdHoc(api, pivot(), 'description,desc'))).toEqual(['Zomato', 'Uber', 'Swiggy', 'Salary', 'Bus']);

    const withColumns = pivot([{ field: 'type' }]);
    const measureBlocked = await runAdHoc(api, withColumns, 'spend_sum,desc');
    expectStatus(measureBlocked, 400);
    const dimensionOk = await runAdHoc(api, withColumns, 'description,asc');
    expectStatus(dimensionOk, 200);
    expect(keys(dimensionOk)).toEqual(['Bus', 'Salary', 'Swiggy', 'Uber', 'Zomato']);

    const notDimension = await runAdHoc(api, pivot(), 'category,asc');
    expectStatus(notDimension, 400);
    expectStatus(await runAdHoc(api, pivot(), 'amount'), 400);
  });

  test('an in-memory pivot honours its saved sort and a runtime sort, like the SQL pivot', async ({ request }) => {
    const { api } = await newUser(request, 'sort-memory-pivot');
    await createBankAccount(api, { name: 'Sort Bank', openingBalance: 9000 });
    const card = await createCreditCard(api, { name: 'Sort Card', last4: '6161' });
    await createTransaction(api, card.id, { amount: -1200, description: 'Card spend' });
    const friend = await createCounterparty(api, { name: 'Sort Friend' });
    await addLending(api, { counterpartyId: friend.id, direction: 'lent', amount: 4000, entryDate: istToday(-2) });

    const definition = (sort?: unknown) => ({
      mode: 'aggregated',
      rows: [{ field: 'kind' }],
      measures: [{ field: 'value', aggregation: 'sum' }],
      filters: [],
      ...(sort ? { sort } : {}),
    });
    const kinds = (res: { data?: unknown }) => (res.data as unknown as { rows: PivotRow[] }).rows.map((r) => r.values.kind);

    const saved = await createReport(api, {
      name: 'Net worth by kind',
      type: 'TABLE',
      datasource: 'net_worth',
      definition: definition([{ key: 'value_sum', direction: 'desc' }]),
    } as never);
    const bySaved = await runSaved(api, saved.id);
    expectStatus(bySaved, 200);
    expect(pivotRows(bySaved, 'kind', 'value_sum')).toEqual([
      ['bank_account', 9000],
      ['lending', 4000],
      ['credit_card', 1200],
    ]);
    expect(kinds(await runSaved(api, saved.id, 'value_sum,asc')), 'the runtime clause replaces the saved one').toEqual([
      'credit_card',
      'lending',
      'bank_account',
    ]);
    expect(kinds(await runSaved(api, saved.id, 'kind,asc'))).toEqual(['bank_account', 'credit_card', 'lending']);
    // Stable across pages.
    const second = await runSaved(api, saved.id, 'value_sum,asc', 1, 2);
    expect(kinds(second)).toEqual(['bank_account']);

    const adHoc = await runAdHoc(api, { type: 'TABLE', datasource: 'net_worth', definition: definition() }, 'kind,desc');
    expectStatus(adHoc, 200);
    expect(kinds(adHoc)).toEqual(['lending', 'credit_card', 'bank_account']);
    expectStatus(await runAdHoc(api, { type: 'TABLE', datasource: 'net_worth', definition: definition() }, 'name,asc'), 400);
  });

  test('KPI and chart runs ignore the sort param, but a malformed one is still a 400', async ({ request }) => {
    const { api } = await newUser(request, 'sort-kpi');
    await seedSpendMonths(api);
    const kpi = { type: 'KPI', datasource: 'transactions', definition: { measure: 'spend', aggregation: 'sum', filters: [] } };
    const plain = await runAdHoc(api, kpi);
    const sorted = await runAdHoc(api, kpi, 'description,desc');
    expectStatus(sorted, 200);
    expect(sorted.data).toEqual(plain.data);
    const chart = {
      type: 'CHART',
      datasource: 'transactions',
      definition: { chartType: 'bar', dimension: { field: 'type' }, measure: { field: 'spend', aggregation: 'sum' }, filters: [] },
    };
    const chartSorted = await runAdHoc(api, chart, 'description,desc');
    expectStatus(chartSorted, 200);
    expect(chartSorted.data).toEqual((await runAdHoc(api, chart)).data);
    expectStatus(await runAdHoc(api, kpi, 'amount'), 400);
  });

  test('a built-in table template takes the sort param too', async ({ request }) => {
    const { api } = await newUser(request, 'sort-builtin');
    await loanWithFirstEmiIn(api, 'Sort Alpha', 2);
    await loanWithFirstEmiIn(api, 'Sort Beta', 5);
    await loanWithFirstEmiIn(api, 'Sort Gamma', 9);
    const titles = (res: { data?: unknown }) => rowsOf(res).map((r) => r.title);

    const byDefault = await runBuiltin(api, 'upcoming');
    expectStatus(byDefault, 200);
    expect(titles(byDefault), "the template's own sort: due date ascending").toEqual([
      'Sort Alpha EMI #1',
      'Sort Beta EMI #1',
      'Sort Gamma EMI #1',
    ]);
    const reversed = await runBuiltin(api, 'upcoming', 'dueDate,desc', { days: 14 });
    expectStatus(reversed, 200);
    expect(titles(reversed)).toEqual(['Sort Gamma EMI #1', 'Sort Beta EMI #1', 'Sort Alpha EMI #1']);
    expect(titles(await runBuiltin(api, 'upcoming', 'title,desc'))).toEqual([
      'Sort Gamma EMI #1',
      'Sort Beta EMI #1',
      'Sort Alpha EMI #1',
    ]);
    expectStatus(await runBuiltin(api, 'upcoming', 'kind,asc'), 400);
    expectStatus(await runBuiltin(api, 'upcoming', 'dueDate,sideways'), 400);
    // The KPI built-in ignores it.
    expectStatus(await runBuiltin(api, 'net_worth', 'name,asc'), 200);
  });
});
