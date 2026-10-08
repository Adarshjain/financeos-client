import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { runSaved } from '../fixtures/seed/reports';
import { createCategory, createTransaction } from '../fixtures/seed/transactions';
import { expectUnauthenticated, newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const SPEND_NAME = 'Spend this month';

async function listDashboards(api: ApiClient) {
  const res = await api.GET('/api/v1/dashboards');
  expectStatus(res, 200);
  return res.data!;
}

async function spendReports(api: ApiClient) {
  const res = await api.GET('/api/v1/reports');
  expectStatus(res, 200);
  return res.data!.filter((r) => r.name === SPEND_NAME);
}

test.describe('Home dashboard seeding (@api)', () => {
  test('the first dashboards read seeds one default Home with the five widgets', async ({ request }) => {
    const { api } = await newUser(request, 'home-seed');
    const dashboards = await listDashboards(api);
    expect(dashboards).toHaveLength(1);
    const home = dashboards[0];
    expect(home).toMatchObject({ name: 'Home', isDefault: true, description: 'Your money at a glance' });
    expect(home.widgets).toHaveLength(5);

    const byId = Object.fromEntries(home.widgets.map((w) => [w.id, w]));
    expect(byId.net_worth).toMatchObject({ kind: 'builtin', builtinKey: 'net_worth', layout: { x: 0, y: 0, w: 50, h: 16 } });
    expect(byId.attention).toMatchObject({ kind: 'builtin', builtinKey: 'attention', layout: { x: 50, y: 0, w: 50, h: 16 } });
    expect(byId.bills_due).toMatchObject({ kind: 'builtin', builtinKey: 'bills_due', layout: { x: 0, y: 16, w: 100, h: 22 } });
    expect(byId.upcoming).toMatchObject({ kind: 'builtin', builtinKey: 'upcoming', layout: { x: 0, y: 38, w: 100, h: 22 } });
    expect(byId.upcoming.params).toEqual({ days: 14 });
    expect(byId.spend_this_month).toMatchObject({ kind: 'report', title: SPEND_NAME, layout: { x: 0, y: 60, w: 100, h: 28 } });
    expect(byId.spend_this_month.report).toMatchObject({ available: true, name: SPEND_NAME, type: 'CHART' });
  });

  test('seeding happens once: a second read returns the same Home and creates nothing', async ({ request }) => {
    const { api } = await newUser(request, 'home-once');
    const first = await listDashboards(api);
    const second = await listDashboards(api);
    expect(second.map((d) => d.id)).toEqual(first.map((d) => d.id));
    expect(second).toHaveLength(1);
    expect(await spendReports(api)).toHaveLength(1);
  });

  test('a deleted Home is not seeded again', async ({ request }) => {
    const { api } = await newUser(request, 'home-deleted');
    const [home] = await listDashboards(api);
    expectStatus(await api.DELETE('/api/v1/dashboards/{id}', { params: { path: { id: home.id } } }), 204);
    expect(await listDashboards(api)).toEqual([]);
    expectStatus(await api.GET('/api/v1/dashboards/default'), 404);
  });

  test('GET /dashboards/default seeds Home first and returns it', async ({ request }) => {
    const { api } = await newUser(request, 'home-default');
    const res = await api.GET('/api/v1/dashboards/default');
    expectStatus(res, 200);
    expect(res.data).toMatchObject({ name: 'Home', isDefault: true });
    expect(res.data!.widgets).toHaveLength(5);
    expect(await listDashboards(api)).toHaveLength(1);
  });

  test('reading one dashboard by id does not seed', async ({ request }) => {
    const { api } = await newUser(request, 'home-byid');
    const created = await api.POST('/api/v1/dashboards', { body: { name: 'Mine', widgets: [] } });
    expectStatus(created, 201);
    expectStatus(await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: created.data!.id } } }), 200);
    expect(await spendReports(api), 'nothing seeded yet').toHaveLength(0);
  });

  test('a user who already has a dashboard still gets Home once, as the default', async ({ request }) => {
    const { api } = await newUser(request, 'home-existing');
    const mine = await api.POST('/api/v1/dashboards', { body: { name: 'Mine', isDefault: true, widgets: [] } });
    expectStatus(mine, 201);

    const dashboards = await listDashboards(api);
    expect(dashboards.map((d) => d.name).sort()).toEqual(['Home', 'Mine']);
    expect(dashboards.filter((d) => d.isDefault).map((d) => d.name)).toEqual(['Home']);
    expect(await listDashboards(api)).toHaveLength(2);
  });

  test('concurrent first reads seed exactly once', async ({ request }) => {
    const { api } = await newUser(request, 'home-race');
    const results = await Promise.all(Array.from({ length: 5 }, () => api.GET('/api/v1/dashboards')));
    for (const r of results) {
      expectStatus(r, 200);
    }
    const dashboards = await listDashboards(api);
    expect(dashboards.filter((d) => d.name === 'Home')).toHaveLength(1);
    expect(await spendReports(api)).toHaveLength(1);
  });

  test('every user gets their own Home', async ({ request }) => {
    const a = await newUser(request, 'home-own-a');
    const b = await newUser(request, 'home-own-b');
    const [homeA] = await listDashboards(a.api);
    const [homeB] = await listDashboards(b.api);
    expect(homeA.id).not.toBe(homeB.id);
    const listA = await listDashboards(a.api);
    expect(listA.some((d) => d.id === homeB.id)).toBe(false);
    expect(homeA.widgets.find((w) => w.id === 'spend_this_month')!.reportId).not.toBe(homeB.widgets.find((w) => w.id === 'spend_this_month')!.reportId);
  });

  test('the seeded Spend this month report is a debit-by-category bar chart over spend', async ({ request }) => {
    const { api } = await newUser(request, 'home-report');
    await listDashboards(api);
    const [report] = await spendReports(api);
    expect(report).toBeTruthy();
    const full = await api.GET('/api/v1/reports/{id}', { params: { path: { id: report.id } } });
    expectStatus(full, 200);
    expect(full.data).toMatchObject({ type: 'CHART', datasource: 'transactions', description: 'Debits this month, by category' });
    const def = full.data!.definition as { chartType: string; dimension: { field: string }; measure: { field: string; aggregation: string }; filters: unknown[] };
    expect(def).toMatchObject({ chartType: 'bar', dimension: { field: 'category' }, measure: { field: 'spend', aggregation: 'sum' } });
    expect(def.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'date', operator: 'this_month' }),
        expect.objectContaining({ field: 'type', operator: 'is', value: 'DEBIT' }),
        expect.objectContaining({ field: 'isExcluded', operator: 'is', value: false }),
        expect.objectContaining({ field: 'isTransferLeg', operator: 'is', value: false }),
      ]),
    );
  });

  test('the seeded chart counts this month\'s included debits, positive, and nothing else', async ({ request }) => {
    const { api } = await newUser(request, 'home-chart');
    const bank = await createBankAccount(api, { name: 'Spend Bank' });
    const card = await createCreditCard(api, { name: 'Spend Card', last4: '8201' });
    const food = await createCategory(api, 'Spend Food');
    const fun = await createCategory(api, 'Spend Fun');

    await createTransaction(api, bank.id, { amount: -1200, description: 'Groceries', categoryIds: [food.id] });
    await createTransaction(api, bank.id, { amount: -300, description: 'Food again', categoryIds: [food.id] });
    await createTransaction(api, bank.id, { amount: -700, description: 'Movie', categoryIds: [fun.id] });
    await createTransaction(api, bank.id, { amount: -9999, description: 'Excluded spend', categoryIds: [fun.id], isTransactionExcluded: true });
    await createTransaction(api, bank.id, { amount: 5000, description: 'Salary', categoryIds: [fun.id] });
    const payDebit = await createTransaction(api, bank.id, { amount: -4000, description: 'Card bill pay', categoryIds: [fun.id] });
    const payCredit = await createTransaction(api, card.id, { amount: 4000, description: 'Payment received' });
    expectStatus(
      await api.POST('/api/v1/transaction-links', {
        body: { type: 'CC_PAYMENT', members: [{ transactionId: payDebit.id, isAnchor: true }, { transactionId: payCredit.id, isAnchor: false }] },
      }),
      201,
    );

    const [home] = await listDashboards(api);
    const reportId = home.widgets.find((w) => w.id === 'spend_this_month')!.reportId!;
    const data = (await runSaved(api, reportId)) as unknown as { categories: string[]; series: Array<{ data: Array<number | null> }> };
    const byCategory: Record<string, number> = {};
    data.categories.forEach((c, i) => {
      byCategory[c] = Number(data.series[0].data[i] ?? 0);
    });
    expect(byCategory).toEqual({ 'Spend Food': 1500, 'Spend Fun': 700 });
  });
});

test.describe('Restore Home (@api)', () => {
  test('restore creates a fresh Home as the default and demotes the old one', async ({ request }) => {
    const { api } = await newUser(request, 'home-restore');
    const [original] = await listDashboards(api);

    const res = await api.POST('/api/v1/dashboards/home/restore');
    expectStatus(res, 201);
    const restored = res.data!;
    expect(restored.id).not.toBe(original.id);
    expect(restored).toMatchObject({ name: 'Home', isDefault: true });
    expect(restored.widgets.map((w) => w.id).sort()).toEqual(['attention', 'bills_due', 'net_worth', 'spend_this_month', 'upcoming']);

    const oldNow = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: original.id } } });
    expect(oldNow.data!.isDefault).toBe(false);
    const def = await api.GET('/api/v1/dashboards/default');
    expect(def.data!.id).toBe(restored.id);
    expect(await listDashboards(api)).toHaveLength(2);
  });

  test('restore reuses the existing Spend this month report instead of piling up copies', async ({ request }) => {
    const { api } = await newUser(request, 'home-restore-reuse');
    const [original] = await listDashboards(api);
    const originalReport = original.widgets.find((w) => w.id === 'spend_this_month')!.reportId;

    const restored = await api.POST('/api/v1/dashboards/home/restore');
    expectStatus(restored, 201);
    expect(restored.data!.widgets.find((w) => w.id === 'spend_this_month')!.reportId).toBe(originalReport);
    expect(await spendReports(api)).toHaveLength(1);
  });

  test('restore recreates the report when the user deleted it', async ({ request }) => {
    const { api } = await newUser(request, 'home-restore-deleted');
    const [original] = await listDashboards(api);
    const originalReport = original.widgets.find((w) => w.id === 'spend_this_month')!.reportId!;
    expectStatus(await api.DELETE('/api/v1/reports/{id}', { params: { path: { id: originalReport } } }), 204);

    const restored = await api.POST('/api/v1/dashboards/home/restore');
    expectStatus(restored, 201);
    const spend = restored.data!.widgets.find((w) => w.id === 'spend_this_month')!;
    expect(spend.reportId).not.toBe(originalReport);
    expect(spend.report).toMatchObject({ available: true, name: SPEND_NAME });
    expect(restored.data!.widgets).toHaveLength(5);
  });

  test('restore for a user who never loaded dashboards seeds once, and the first read adds nothing', async ({ request }) => {
    const { api } = await newUser(request, 'home-restore-first');
    const restored = await api.POST('/api/v1/dashboards/home/restore');
    expectStatus(restored, 201);
    const dashboards = await listDashboards(api);
    expect(dashboards.filter((d) => d.name === 'Home')).toHaveLength(1);
    expect(dashboards[0].id).toBe(restored.data!.id);
  });

  test('restore only touches the caller', async ({ request }) => {
    const a = await newUser(request, 'home-restore-a');
    const b = await newUser(request, 'home-restore-b');
    await listDashboards(b.api);
    expectStatus(await a.api.POST('/api/v1/dashboards/home/restore'), 201);
    expect(await listDashboards(b.api)).toHaveLength(1);
  });

  test('restore requires a session', async () => {
    await expectUnauthenticated('POST', '/api/v1/dashboards/home/restore');
  });
});
