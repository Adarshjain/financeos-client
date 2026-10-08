import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { addLending, createCounterparty } from '../fixtures/seed/loans';
import { loanWithFirstEmiIn, shiftDate } from '../fixtures/seed/nav';
import { catalog, createReport, runAdHoc } from '../fixtures/seed/reports';
import { createCategory, createTransaction, searchAll } from '../fixtures/seed/transactions';
import { expectForeign, expectUnauthenticated, newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

type Filter = { field: string; operator: string; value?: unknown };
type Row = Record<string, unknown>;

async function kpi(api: ApiClient, datasource: string, measure: string, filters: Filter[], aggregation = 'sum'): Promise<number> {
  const data = (await runAdHoc(api, { type: 'KPI', datasource, definition: { measure, aggregation, filters } } as never)) as unknown as { value: number | null };
  return Number(data.value ?? 0);
}

async function chart(api: ApiClient, datasource: string, dimension: string, measure: string, filters: Filter[] = []): Promise<Record<string, number>> {
  const data = (await runAdHoc(api, {
    type: 'CHART',
    datasource,
    definition: { chartType: 'bar', dimension: { field: dimension }, measure: { field: measure, aggregation: 'sum' }, filters },
  } as never)) as unknown as { categories: string[]; series: Array<{ data: Array<number | null> }> };
  const out: Record<string, number> = {};
  data.categories.forEach((c, i) => {
    out[c] = Number(data.series[0].data[i] ?? 0);
  });
  return out;
}

async function rawRows(api: ApiClient, datasource: string, columns: string[], filters: Filter[] = []): Promise<Row[]> {
  const data = (await runAdHoc(api, { type: 'TABLE', datasource, definition: { mode: 'raw', columns, filters } } as never)) as unknown as { rows: Row[] };
  return data.rows;
}

const nextDays = (amount: number): Filter => ({ field: 'date', operator: 'next_x_days', value: { amount } });

test.describe('Report catalog additions (@api)', () => {
  test('the catalog lists net_worth, obligations and attention after the existing datasources', async ({ request }) => {
    const { api } = await newUser(request, 'rn-catalog');
    const data = await catalog(api);
    const names = data.datasources.map((d) => d.name);
    expect(names.slice(-3)).toEqual(['net_worth', 'obligations', 'attention']);
    expect(names).toHaveLength(16);

    const fields = (name: string) => data.datasources.find((d) => d.name === name)!.fields.map((f) => f.name);
    expect(fields('net_worth')).toEqual(['id', 'name', 'kind', 'side', 'value', 'signedValue', 'asOf']);
    expect(fields('obligations')).toEqual(['id', 'dueDate', 'kind', 'title', 'accountName', 'amount', 'status', 'daysUntil', 'href', 'refId']);
    expect(fields('attention')).toEqual(['id', 'kind', 'label', 'severity', 'section', 'count', 'href']);

    const kindField = data.datasources.find((d) => d.name === 'attention')!.fields.find((f) => f.name === 'kind')!;
    expect(kindField.values).toEqual(['bill', 'emi', 'lending', 'statement_expected', 'gmail_reconnect', 'gmail_attention', 'review', 'job', 'reward_milestone', 'reward_cap']);
    const obKind = data.datasources.find((d) => d.name === 'obligations')!.fields.find((f) => f.name === 'kind')!;
    expect(obKind.values).toEqual(['card_bill', 'emi', 'lending_return', 'statement_expected']);
  });

  test('next_x_days is a relative date operator and spend is a transactions measure', async ({ request }) => {
    const { api } = await newUser(request, 'rn-catalog-ops');
    const data = await catalog(api);
    expect(data.operators.date.relative).toContain('next_x_days');
    const txn = data.datasources.find((d) => d.name === 'transactions')!;
    const spend = txn.fields.find((f) => f.name === 'spend')!;
    expect(spend).toMatchObject({ label: 'Spend', type: 'number', role: 'measure' });
    expect(spend.aggregations).toContain('sum');
  });
});

test.describe('Spend measure (@api)', () => {
  test('spend is positive for debits and negative for credits, so a refund reduces it', async ({ request }) => {
    const { api } = await newUser(request, 'rn-spend');
    const bank = await createBankAccount(api, { name: 'Spend Measure Bank' });
    const cat = await createCategory(api, 'Spend Measure Cat');
    await createTransaction(api, bank.id, { amount: -1000, categoryIds: [cat.id], description: 'Buy' });
    await createTransaction(api, bank.id, { amount: -250, categoryIds: [cat.id], description: 'Buy 2' });
    await createTransaction(api, bank.id, { amount: 400, categoryIds: [cat.id], description: 'Refund' });

    expect(await kpi(api, 'transactions', 'spend', [])).toBe(850);
    expect(await kpi(api, 'transactions', 'amount', []), 'the signed amount keeps its sign').toBe(-850);
    expect(await kpi(api, 'transactions', 'spend', [{ field: 'type', operator: 'is', value: 'DEBIT' }])).toBe(1250);
    expect(await kpi(api, 'transactions', 'spend', [], 'count')).toBe(3);
    expect(await chart(api, 'transactions', 'category', 'spend')).toEqual({ 'Spend Measure Cat': 850 });
  });

  test('a saved report may use the spend measure', async ({ request }) => {
    const { api } = await newUser(request, 'rn-spend-saved');
    const saved = await createReport(api, {
      name: 'Spend KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [] },
    });
    expect(saved.id).toBeTruthy();
  });
});

test.describe('next_x_days date preset (@api)', () => {
  test('a report over transactions covers [today, today + N - 1]', async ({ request }) => {
    const { api } = await newUser(request, 'rn-next-report');
    const bank = await createBankAccount(api, { name: 'Next Days Bank' });
    await createTransaction(api, bank.id, { amount: -10, date: istToday(-1), description: 'yesterday' });
    await createTransaction(api, bank.id, { amount: -20, date: istToday(0), description: 'today' });
    await createTransaction(api, bank.id, { amount: -40, date: istToday(2), description: 'in two days' });
    await createTransaction(api, bank.id, { amount: -80, date: istToday(3), description: 'in three days' });

    expect(await kpi(api, 'transactions', 'spend', [nextDays(1)])).toBe(20);
    expect(await kpi(api, 'transactions', 'spend', [nextDays(3)])).toBe(60);
    expect(await kpi(api, 'transactions', 'spend', [nextDays(4)])).toBe(140);
    expect(await kpi(api, 'transactions', 'spend', [nextDays(90)])).toBe(140);
  });

  test('the transactions list accepts the same preset', async ({ request }) => {
    const { api } = await newUser(request, 'rn-next-list');
    const bank = await createBankAccount(api, { name: 'Next List Bank' });
    await createTransaction(api, bank.id, { amount: -10, date: istToday(-1), description: 'listed yesterday' });
    const today = await createTransaction(api, bank.id, { amount: -20, date: istToday(0), description: 'listed today' });
    const soon = await createTransaction(api, bank.id, { amount: -40, date: istToday(2), description: 'listed soon' });
    await createTransaction(api, bank.id, { amount: -80, date: istToday(3), description: 'listed later' });

    const ids = async (n: number) => (await searchAll(api, [nextDays(n)])).map((t) => t.id).sort();
    expect(await ids(1)).toEqual([today.id]);
    expect(await ids(3)).toEqual([today.id, soon.id].sort());
  });

  test('a non-positive amount is rejected', async ({ request }) => {
    const { api } = await newUser(request, 'rn-next-bad');
    const res = await api.POST('/api/v1/reports/data', {
      body: { type: 'KPI', datasource: 'transactions', definition: { measure: 'spend', aggregation: 'sum', filters: [nextDays(0)] } } as never,
    });
    expectStatus(res, 400);
  });
});

test.describe('net_worth datasource (@api)', () => {
  test('one row per counted account, active loan and counterparty with the right side and sign', async ({ request }) => {
    const { api } = await newUser(request, 'rn-networth');
    await createBankAccount(api, { name: 'NW Bank', openingBalance: 12345.67 });
    await createBankAccount(api, { name: 'NW Hidden', openingBalance: 777, excludeFromNetAsset: true });
    const card = await createCreditCard(api, { name: 'NW Card', last4: '8501' });
    await createTransaction(api, card.id, { amount: -2000, description: 'Card spend' });
    await createCounterparty(api, { name: 'NW Debtor' }).then((cp) => addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 5000, entryDate: istToday(-5) }));
    await createCounterparty(api, { name: 'NW Creditor' }).then((cp) => addLending(api, { counterpartyId: cp.id, direction: 'borrowed', amount: 1500, entryDate: istToday(-5) }));
    await createCounterparty(api, { name: 'NW Settled' }).then(async (cp) => {
      await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 100, entryDate: istToday(-5) });
      await addLending(api, { counterpartyId: cp.id, direction: 'borrowed', amount: 100, entryDate: istToday(-4) });
    });
    await loanWithFirstEmiIn(api, 'NW Loan', 10);

    const rows = await rawRows(api, 'net_worth', ['id', 'name', 'kind', 'side', 'value', 'signedValue', 'asOf']);
    const byName = Object.fromEntries(rows.map((r) => [String(r.name), r]));

    expect(byName['NW Bank']).toMatchObject({ kind: 'bank_account', side: 'asset', asOf: istToday() });
    expect(Number(byName['NW Bank'].value)).toBeCloseTo(12345.67, 2);
    expect(Number(byName['NW Bank'].signedValue)).toBeCloseTo(12345.67, 2);
    expect(byName['NW Bank'].id, 'rows carry their entity id').toBeTruthy();

    expect(byName['NW Hidden'], 'accounts excluded from net assets are left out').toBeUndefined();

    expect(byName['NW Card']).toMatchObject({ kind: 'credit_card', side: 'liability' });
    expect(Number(byName['NW Card'].value)).toBeCloseTo(2000, 2);
    expect(Number(byName['NW Card'].signedValue)).toBeCloseTo(-2000, 2);

    expect(byName['NW Debtor']).toMatchObject({ kind: 'lending', side: 'asset' });
    expect(Number(byName['NW Debtor'].value)).toBe(5000);
    expect(byName['NW Creditor']).toMatchObject({ kind: 'lending', side: 'liability' });
    expect(Number(byName['NW Creditor'].signedValue)).toBe(-1500);
    expect(byName['NW Settled'], 'a zero net position is not a row').toBeUndefined();

    expect(byName['NW Loan']).toMatchObject({ kind: 'loan', side: 'liability' });
    expect(Number(byName['NW Loan'].value)).toBeGreaterThan(0);
    expect(Number(byName['NW Loan'].signedValue)).toBe(-Number(byName['NW Loan'].value));

    const signedSum = rows.reduce((s, r) => s + Number(r.signedValue), 0);
    expect(await kpi(api, 'net_worth', 'signedValue', [])).toBeCloseTo(signedSum, 2);
    const sides = await chart(api, 'net_worth', 'side', 'value');
    expect(sides.asset).toBeCloseTo(12345.67 + 5000, 2);
    expect(sides.liability).toBeCloseTo(2000 + 1500 + Number(byName['NW Loan'].value), 2);
    // Computed rows always carry their id; only the names matter here.
    const loanRows = await rawRows(api, 'net_worth', ['name'], [{ field: 'kind', operator: 'is', value: 'loan' }]);
    expect(loanRows.map((r) => r.name)).toEqual(['NW Loan']);
  });

  test('a user with nothing has no rows and a zero net worth', async ({ request }) => {
    const { api } = await newUser(request, 'rn-networth-empty');
    expect(await rawRows(api, 'net_worth', ['name'])).toEqual([]);
    expect(await kpi(api, 'net_worth', 'signedValue', [])).toBe(0);
  });

  test('net worth is per user', async ({ request }) => {
    const a = await newUser(request, 'rn-networth-a');
    const b = await newUser(request, 'rn-networth-b');
    await createBankAccount(a.api, { name: 'Only A', openingBalance: 4242 });
    expect(await kpi(a.api, 'net_worth', 'signedValue', [])).toBeCloseTo(4242, 2);
    expect(await kpi(b.api, 'net_worth', 'signedValue', [])).toBe(0);
  });
});

test.describe('obligations datasource (@api)', () => {
  test('rows mirror the obligations list, keyed like the inbox, and filter on dueDate', async ({ request }) => {
    const { api } = await newUser(request, 'rn-obligations');
    const soon = await loanWithFirstEmiIn(api, 'RN Soon', 3);
    await loanWithFirstEmiIn(api, 'RN Late', 20);
    const cp = await createCounterparty(api, { name: 'RN Friend' });
    await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 900, entryDate: shiftDate(istToday(), -4), expectedReturnDate: istToday(5) });

    const due = (n: number): Filter => ({ field: 'dueDate', operator: 'next_x_days', value: { amount: n } });
    const rows = await rawRows(api, 'obligations', ['id', 'dueDate', 'kind', 'title', 'amount', 'status', 'daysUntil', 'refId', 'accountName'], [due(7)]);
    expect(rows.map((r) => r.id).sort()).toEqual([`emi:${soon.id}:1`, `lending:${cp.id}`].sort());

    const emiRow = rows.find((r) => r.kind === 'emi')!;
    expect(emiRow).toMatchObject({ dueDate: istToday(3), title: 'RN Soon EMI #1', status: 'due_soon', refId: soon.id, accountName: 'RN Soon' });
    expect(Number(emiRow.daysUntil)).toBe(3);
    const lendRow = rows.find((r) => r.kind === 'lending_return')!;
    expect(lendRow).toMatchObject({ title: 'RN Friend owes you', status: 'due_soon', refId: cp.id });
    expect(Number(lendRow.amount)).toBe(900);

    expect(await kpi(api, 'obligations', 'amount', [due(7)])).toBeCloseTo(Number(emiRow.amount) + 900, 2);
    expect(await kpi(api, 'obligations', 'amount', [due(3)]), 'day 3 is outside [today, today+2]').toBe(0);
    expect((await rawRows(api, 'obligations', ['id'], [due(30)])).length).toBeGreaterThan(rows.length);
    expect(await rawRows(api, 'obligations', ['id'], [{ field: 'kind', operator: 'is', value: 'lending_return' }, due(7)])).toEqual([{ id: `lending:${cp.id}` }]);
  });

  test('a user with nothing has no rows', async ({ request }) => {
    const { api } = await newUser(request, 'rn-obligations-empty');
    expect(await rawRows(api, 'obligations', ['id'])).toEqual([]);
  });
});

test.describe('attention datasource (@api)', () => {
  test('one row per inbox kind with the worst severity, a count and a link', async ({ request }) => {
    const { api } = await newUser(request, 'rn-attention');
    const one = await loanWithFirstEmiIn(api, 'RN Attn One', 2);
    const two = await loanWithFirstEmiIn(api, 'RN Attn Two', 4);
    const cp = await createCounterparty(api, { name: 'RN Attn Friend' });
    await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 250, entryDate: shiftDate(istToday(), -4), expectedReturnDate: istToday(3) });

    const cols = ['id', 'kind', 'label', 'severity', 'section', 'count', 'href'];
    let rows = await rawRows(api, 'attention', cols);
    const byKind = Object.fromEntries(rows.map((r) => [String(r.kind), r]));
    expect(Object.keys(byKind).sort()).toEqual(['emi', 'lending']);
    expect(byKind.emi).toMatchObject({ id: 'emi', label: 'EMIs', severity: 'warning', section: 'act_now', href: '/loans' });
    expect(Number(byKind.emi.count)).toBe(2);
    expect(byKind.lending).toMatchObject({ label: 'Lending returns', href: `/loans/lendings/${cp.id}?export=1` });
    expect(Number(byKind.lending.count)).toBe(1);
    expect(await kpi(api, 'attention', 'count', [])).toBe(3);

    // Dismissing one of the two EMIs leaves a lone row, which keeps its own link.
    expectStatus(await api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key: `emi:${two.id}:1` } } }), 200);
    rows = await rawRows(api, 'attention', cols);
    const emi = rows.find((r) => r.kind === 'emi')!;
    expect(Number(emi.count)).toBe(1);
    expect(emi.href).toBe(`/loans/${one.id}?installment=1`);
    expect(await kpi(api, 'attention', 'count', [])).toBe(2);
    expect(await chart(api, 'attention', 'kind', 'count')).toEqual({ emi: 1, lending: 1 });
  });

  test('a user with nothing pending has no rows', async ({ request }) => {
    const { api } = await newUser(request, 'rn-attention-empty');
    expect(await rawRows(api, 'attention', ['kind'])).toEqual([]);
    expect(await kpi(api, 'attention', 'count', [])).toBe(0);
  });
});

test.describe('Duplicate report (@api)', () => {
  test('POST /reports/{id}/duplicate copies the report as "<name> (copy)"', async ({ request }) => {
    const { api } = await newUser(request, 'rn-dup');
    const definition = { chartType: 'bar', dimension: { field: 'category' }, measure: { field: 'spend', aggregation: 'sum' }, filters: [] };
    const original = await createReport(api, { name: 'Dup Source', description: 'about me', type: 'CHART', datasource: 'transactions', definition });

    const res = await api.POST('/api/v1/reports/{id}/duplicate', { params: { path: { id: original.id } } });
    expectStatus(res, 201);
    const copy = res.data!;
    expect(copy.id).not.toBe(original.id);
    expect(copy).toMatchObject({ name: 'Dup Source (copy)', description: 'about me', type: 'CHART', datasource: 'transactions' });
    expect(copy.definition).toEqual(original.definition);

    const again = await api.POST('/api/v1/reports/{id}/duplicate', { params: { path: { id: copy.id } } });
    expectStatus(again, 201);
    expect(again.data!.name).toBe('Dup Source (copy) (copy)');

    const list = await api.GET('/api/v1/reports');
    expect(list.data!.map((r) => r.name).filter((n) => n.startsWith('Dup Source')).sort()).toEqual(['Dup Source', 'Dup Source (copy)', 'Dup Source (copy) (copy)']);
    const unchanged = await api.GET('/api/v1/reports/{id}', { params: { path: { id: original.id } } });
    expect(unchanged.data!.name).toBe('Dup Source');
  });

  test('duplicating a computed-datasource report keeps its datasource', async ({ request }) => {
    const { api } = await newUser(request, 'rn-dup-computed');
    const original = await createReport(api, { name: 'NW KPI', type: 'KPI', datasource: 'net_worth', definition: { measure: 'signedValue', aggregation: 'sum', filters: [] } });
    const copy = await api.POST('/api/v1/reports/{id}/duplicate', { params: { path: { id: original.id } } });
    expectStatus(copy, 201);
    expect(copy.data).toMatchObject({ datasource: 'net_worth', type: 'KPI' });
  });

  test("another user's or an unknown report cannot be duplicated, and a session is required", async ({ request }) => {
    const a = await newUser(request, 'rn-dup-a');
    const b = await newUser(request, 'rn-dup-b');
    const report = await createReport(a.api, { name: 'Private Report', type: 'KPI', datasource: 'transactions', definition: { measure: 'amount', aggregation: 'sum', filters: [] } });

    await expectForeign(b.api, 'POST', `/api/v1/reports/${report.id}/duplicate`);
    const listB = await b.api.GET('/api/v1/reports');
    expect(listB.data!.some((r) => r.name.startsWith('Private Report'))).toBe(false);
    const listA = await a.api.GET('/api/v1/reports');
    expect(listA.data!.filter((r) => r.name.startsWith('Private Report'))).toHaveLength(1);

    expectStatus(await a.api.POST('/api/v1/reports/{id}/duplicate', { params: { path: { id: '00000000-0000-0000-0000-000000000000' } } }), 404);
    await expectUnauthenticated('POST', `/api/v1/reports/${report.id}/duplicate`);
  });
});
