import { randomUUID } from 'node:crypto';

import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import { loanWithFirstEmiIn } from '../fixtures/seed/nav';
import type { DashboardWidget } from '../fixtures/seed/reports';
import { createReport, widget } from '../fixtures/seed/reports';
import { expectUnauthenticated, newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

type Row = Record<string, unknown>;

async function runBuiltin(api: ApiClient, key: string, params?: unknown, query: { page?: number; size?: number } = {}) {
  return api.POST('/api/v1/dashboards/builtins/{key}/data', {
    params: { path: { key }, query },
    body: params === undefined ? undefined : ({ params } as never),
  });
}

function builtinWidget(id: string, builtinKey: string, w: number, params?: unknown): DashboardWidget {
  return { id, kind: 'builtin', builtinKey, params: params as never, layout: { x: 0, y: 0, w, h: 10 } };
}

async function upcomingTitles(api: ApiClient, params?: unknown): Promise<string[]> {
  const res = await runBuiltin(api, 'upcoming', params);
  expectStatus(res, 200);
  return ((res.data as unknown as { rows: Row[] }).rows ?? []).map((r) => String(r.title));
}

test.describe('Built-in widget catalog (@api)', () => {
  test('GET /dashboards/builtins lists the four built-ins with their templates, widths and params', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-catalog');
    const res = await api.GET('/api/v1/dashboards/builtins');
    expectStatus(res, 200);
    const list = res.data!;
    expect(list.map((b) => b.key)).toEqual(['net_worth', 'attention', 'upcoming', 'bills_due']);

    const byKey = Object.fromEntries(list.map((b) => [b.key, b]));
    expect(byKey.net_worth).toMatchObject({
      label: 'Net worth',
      kind: 'template',
      minW: 50,
      templateType: 'KPI',
      datasource: 'net_worth',
      href: '/accounts',
      params: [],
    });
    expect(byKey.net_worth.description).toBeTruthy();
    expect(byKey.net_worth.templateDefinition).toMatchObject({ measure: 'signedValue', aggregation: 'sum' });

    expect(byKey.attention).toMatchObject({ label: 'Inbox', kind: 'component', minW: 50, href: '/inbox', params: [] });
    expect(byKey.attention.templateType ?? null).toBeNull();
    expect(byKey.attention.templateDefinition ?? null).toBeNull();
    expect(byKey.attention.datasource ?? null).toBeNull();

    expect(byKey.upcoming).toMatchObject({ label: 'Upcoming', kind: 'template', minW: 100, templateType: 'TABLE', datasource: 'obligations', href: '/upcoming' });
    expect(byKey.upcoming.params).toEqual([{ name: 'days', type: 'int', required: false, defaultValue: 14, min: 1, max: 90 }]);
    const def = byKey.upcoming.templateDefinition as { filters: Array<{ field: string; operator: string; value: { amount: number } }> };
    expect(def.filters).toEqual([{ field: 'dueDate', operator: 'next_x_days', value: { amount: 14 } }]);

    expect(byKey.bills_due).toMatchObject({ label: 'Bills due', kind: 'component', minW: 100 });
    expect(byKey.bills_due.href ?? null).toBeNull();
    expect(byKey.bills_due.params).toEqual([expect.objectContaining({ name: 'accountId', type: 'uuid', required: false })]);
  });

  test('catalog and data endpoints require a session', async () => {
    await expectUnauthenticated('GET', '/api/v1/dashboards/builtins');
    await expectUnauthenticated('POST', '/api/v1/dashboards/builtins/net_worth/data', {});
    await expectUnauthenticated('POST', '/api/v1/dashboards/home/restore');
  });
});

test.describe('Built-in widget data (@api)', () => {
  test('net_worth returns the KPI sum of signed values (assets minus liabilities)', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-networth');
    await createBankAccount(api, { name: 'Builtin Savings', openingBalance: 5000 });
    await createBankAccount(api, { name: 'Builtin Hidden', openingBalance: 99999, excludeFromNetAsset: true });

    const res = await runBuiltin(api, 'net_worth');
    expectStatus(res, 200);
    expect(Number((res.data as unknown as { value: number }).value)).toBeCloseTo(5000, 2);
  });

  test('net_worth accepts an empty body and a null params object', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-networth-empty');
    expectStatus(await runBuiltin(api, 'net_worth'), 200);
    expectStatus(await runBuiltin(api, 'net_worth', null), 200);
    expectStatus(await runBuiltin(api, 'net_worth', {}), 200);
  });

  test('upcoming defaults to a 14 day horizon and the days param moves it', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-upcoming');
    await loanWithFirstEmiIn(api, 'Up Near', 3);
    await loanWithFirstEmiIn(api, 'Up Mid', 13);
    await loanWithFirstEmiIn(api, 'Up Far', 20);
    await loanWithFirstEmiIn(api, 'Up Overdue', -5);

    const byDefault = await upcomingTitles(api);
    expect(byDefault).toContain('Up Near EMI #1');
    expect(byDefault, 'day 13 is inside 14 days').toContain('Up Mid EMI #1');
    expect(byDefault, 'day 20 is outside').not.toContain('Up Far EMI #1');
    expect(byDefault, 'overdue rows are before the window').not.toContain('Up Overdue EMI #1');

    expect(await upcomingTitles(api, { days: 14 })).toEqual(byDefault);
    expect(await upcomingTitles(api, { days: 30 })).toContain('Up Far EMI #1');
    expect(await upcomingTitles(api, {})).toEqual(byDefault);
    expect(await upcomingTitles(api, null)).toEqual(byDefault);
  });

  test('the days window is inclusive of today and exclusive of day N: next_x_days = [today, today+N-1]', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-upcoming-edge');
    await loanWithFirstEmiIn(api, 'Edge Three', 3);

    expect(await upcomingTitles(api, { days: 3 })).not.toContain('Edge Three EMI #1');
    expect(await upcomingTitles(api, { days: 4 })).toContain('Edge Three EMI #1');
    expect(await upcomingTitles(api, { days: 1 })).not.toContain('Edge Three EMI #1');
    expect(await upcomingTitles(api, { days: 90 })).toContain('Edge Three EMI #1');
  });

  test('upcoming honours the size query parameter', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-upcoming-page');
    await loanWithFirstEmiIn(api, 'Page One', 2);
    await loanWithFirstEmiIn(api, 'Page Two', 4);

    const res = await runBuiltin(api, 'upcoming', undefined, { size: 1 });
    expectStatus(res, 200);
    expect((res.data as unknown as { rows: Row[] }).rows).toHaveLength(1);
  });

  test('param validation: out of range, wrong type, undeclared and non-object are all 400', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-params');
    for (const params of [{ days: 0 }, { days: 91 }, { days: -3 }, { days: 5.5 }, { days: '7' }, { days: true }, { other: 1 }, { days: 7, other: 1 }, [1, 2], 5, 'x']) {
      const res = await runBuiltin(api, 'upcoming', params);
      expectStatus(res, 400);
      expect(res.error?.code, JSON.stringify(params)).toBe('VALIDATION_ERROR');
    }
    // Edges of the declared range are fine.
    expectStatus(await runBuiltin(api, 'upcoming', { days: 1 }), 200);
    expectStatus(await runBuiltin(api, 'upcoming', { days: 90 }), 200);
  });

  test('a built-in without declared params rejects any param', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-noparams');
    const res = await runBuiltin(api, 'net_worth', { days: 5 });
    expectStatus(res, 400);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  test('component built-ins have no report data (400) and unknown keys are 404', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-components');
    for (const key of ['attention', 'bills_due']) {
      const res = await runBuiltin(api, key);
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    }
    expectStatus(await runBuiltin(api, 'no_such_widget'), 404);
  });

  test('a component with an undeclared param is still a 400', async ({ request }) => {
    const { api } = await newUser(request, 'builtins-component-param');
    expectStatus(await runBuiltin(api, 'attention', { days: 3 }), 400);
  });

  test('the data is per user', async ({ request }) => {
    const a = await newUser(request, 'builtins-tenancy-a');
    const b = await newUser(request, 'builtins-tenancy-b');
    await loanWithFirstEmiIn(a.api, 'Private EMI', 2);
    expect(await upcomingTitles(a.api)).toContain('Private EMI EMI #1');
    expect(await upcomingTitles(b.api)).not.toContain('Private EMI EMI #1');
  });
});

test.describe('Dashboards with built-in widgets (@api)', () => {
  test('a built-in widget is stored, enriched with its catalog entry, and has no report', async ({ request }) => {
    const { api } = await newUser(request, 'dash-builtin-create');
    const created = await api.POST('/api/v1/dashboards', {
      body: {
        name: 'Builtin Dash',
        widgets: [
          builtinWidget('nw', 'net_worth', 50),
          builtinWidget('up', 'upcoming', 100, { days: 30 }),
          builtinWidget('inb', 'attention', 50),
          builtinWidget('bd', 'bills_due', 100, { accountId: randomUUID() }),
        ],
      },
    });
    expectStatus(created, 201);
    const byId = Object.fromEntries(created.data!.widgets.map((w) => [w.id, w]));

    expect(byId.nw).toMatchObject({ kind: 'builtin', builtinKey: 'net_worth' });
    expect(byId.nw.builtin).toMatchObject({ key: 'net_worth', label: 'Net worth', minW: 50, kind: 'template', templateType: 'KPI', href: '/accounts' });
    expect(byId.nw.report ?? null).toBeNull();
    expect(byId.nw.reportId ?? null).toBeNull();

    expect(byId.up.params).toEqual({ days: 30 });
    expect(byId.up.builtin).toMatchObject({ templateType: 'TABLE', minW: 100 });
    expect(byId.inb.builtin).toMatchObject({ label: 'Inbox', kind: 'component', href: '/inbox' });
    expect(byId.bd.builtin).toMatchObject({ label: 'Bills due', kind: 'component' });

    const fetched = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: created.data!.id } } });
    expectStatus(fetched, 200);
    expect(fetched.data!.widgets.find((w) => w.id === 'up')!.params).toEqual({ days: 30 });
  });

  test('minimum widths: exactly the minimum passes, one column less is rejected', async ({ request }) => {
    const { api } = await newUser(request, 'dash-builtin-minw');
    const cases: Array<[string, number]> = [
      ['net_worth', 50],
      ['attention', 50],
      ['upcoming', 100],
      ['bills_due', 100],
    ];
    for (const [key, minW] of cases) {
      const ok = await api.POST('/api/v1/dashboards', { body: { name: `ok ${key}`, widgets: [builtinWidget('w', key, minW)] } });
      expectStatus(ok, 201);
      const narrow = await api.POST('/api/v1/dashboards', { body: { name: `narrow ${key}`, widgets: [builtinWidget('w', key, minW - 1)] } });
      expectStatus(narrow, 400);
      expect(narrow.error?.code, key).toBe('VALIDATION_ERROR');
    }
  });

  test('invalid built-in widgets are rejected', async ({ request }) => {
    const { api } = await newUser(request, 'dash-builtin-invalid');
    const bad: Array<[string, DashboardWidget]> = [
      ['unknown key', builtinWidget('w', 'nope', 100)],
      ['missing key', { id: 'w', kind: 'builtin', layout: { x: 0, y: 0, w: 100, h: 5 } }],
      ['blank key', builtinWidget('w', ' ', 100)],
      ['undeclared param', builtinWidget('w', 'net_worth', 100, { days: 3 })],
      ['days above max', builtinWidget('w', 'upcoming', 100, { days: 91 })],
      ['days below min', builtinWidget('w', 'upcoming', 100, { days: 0 })],
      ['days not an int', builtinWidget('w', 'upcoming', 100, { days: 2.5 })],
      ['accountId not a uuid', builtinWidget('w', 'bills_due', 100, { accountId: 'not-a-uuid' })],
      ['accountId not a string', builtinWidget('w', 'bills_due', 100, { accountId: 12 })],
      ['unknown kind', { id: 'w', kind: 'weird', layout: { x: 0, y: 0, w: 100, h: 5 } }],
      ['report widget without a report', { id: 'w', kind: 'report', layout: { x: 0, y: 0, w: 100, h: 5 } }],
    ];
    for (const [label, w] of bad) {
      const res = await api.POST('/api/v1/dashboards', { body: { name: `bad ${label}`, widgets: [w] } });
      expect(res.response.status, label).toBe(400);
      expect(res.error?.code, label).toBe('VALIDATION_ERROR');
    }
  });

  test('a valid accountId param is stored as given', async ({ request }) => {
    const { api } = await newUser(request, 'dash-builtin-accountid');
    const accountId = randomUUID();
    const res = await api.POST('/api/v1/dashboards', { body: { name: 'Per card', widgets: [builtinWidget('bd', 'bills_due', 100, { accountId })] } });
    expectStatus(res, 201);
    expect(res.data!.widgets[0].params).toEqual({ accountId });
  });

  test('legacy widget JSON without a kind is a report widget, and mixes with built-ins', async ({ request }) => {
    const { api } = await newUser(request, 'dash-builtin-legacy');
    const report = await createReport(api, {
      name: 'Legacy Report',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });
    const legacy = widget(report.id, { x: 0, y: 0, w: 50, h: 4 });
    expect((legacy as { kind?: unknown }).kind).toBeUndefined();

    const res = await api.POST('/api/v1/dashboards', { body: { name: 'Mixed', widgets: [legacy, builtinWidget('nw', 'net_worth', 50)] } });
    expectStatus(res, 201);
    const r = res.data!.widgets.find((w) => w.id === legacy.id)!;
    expect(r.kind).toBe('report');
    expect(r.reportId).toBe(report.id);
    expect(r.report).toMatchObject({ available: true, name: 'Legacy Report', type: 'KPI' });
    expect(r.builtinKey ?? null).toBeNull();
  });

  test('PUT replaces a built-in widget and revalidates it', async ({ request }) => {
    const { api } = await newUser(request, 'dash-builtin-put');
    const created = await api.POST('/api/v1/dashboards', { body: { name: 'Put Me', widgets: [builtinWidget('up', 'upcoming', 100, { days: 7 })] } });
    expectStatus(created, 201);
    const id = created.data!.id;

    const ok = await api.PUT('/api/v1/dashboards/{id}', { params: { path: { id } }, body: { name: 'Put Me', widgets: [builtinWidget('up', 'upcoming', 100, { days: 45 })] } });
    expectStatus(ok, 200);
    expect(ok.data!.widgets[0].params).toEqual({ days: 45 });

    const bad = await api.PUT('/api/v1/dashboards/{id}', { params: { path: { id } }, body: { name: 'Put Me', widgets: [builtinWidget('up', 'upcoming', 60, { days: 45 })] } });
    expectStatus(bad, 400);
  });
});
