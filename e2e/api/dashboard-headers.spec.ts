import { expectStatus } from '../fixtures/api';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

// Section headers: `kind: "text"` widgets with a title and an optional params.description,
// always the full 100-column width.
const header = (
  id: string,
  title: string | null,
  y: number,
  params: Record<string, unknown> | null = null,
  layout: { x: number; w: number } = { x: 0, w: 100 },
) => ({ id, kind: 'text', title, params, layout: { x: layout.x, y, w: layout.w, h: params ? 6 : 5 } });

test.describe('Dashboard section headers API (@api)', () => {
  test('headers save and read back with report widgets, keep order, and update in place', async ({ api }) => {
    const report = await createReport(api, {
      name: 'Header Spec KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });
    const kpi = widget(report.id, { x: 0, y: 6, w: 50, h: 10 }, null, 'kpi');

    const created = await createDashboard(api, {
      name: 'Sectioned dashboard',
      isDefault: false,
      widgets: [header('h-month', 'This month', 0, { description: '1–10 Oct, all accounts' }), kpi, header('h-invest', 'Investments', 16)],
    });

    const got = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: created.id } } });
    expectStatus(got, 200);
    const widgets = got.data!.widgets;
    expect(widgets.map((w) => [w.id, w.kind])).toEqual([['h-month', 'text'], ['kpi', 'report'], ['h-invest', 'text']]);

    const month = widgets[0];
    expect(month.title).toBe('This month');
    expect(month.params).toEqual({ description: '1–10 Oct, all accounts' });
    expect(month.layout).toEqual({ x: 0, y: 0, w: 100, h: 6 });
    expect(month.report ?? null).toBeNull();
    expect(month.builtin ?? null).toBeNull();
    expect(month.reportId ?? null).toBeNull();
    expect(widgets[2].params ?? null).toBeNull();
    expect(widgets[1].report?.available).toBe(true);

    // PUT: rename a header, drop its description, move it to the top.
    const put = await api.PUT('/api/v1/dashboards/{id}', {
      params: { path: { id: created.id } },
      body: {
        name: 'Sectioned dashboard',
        isDefault: false,
        widgets: [header('h-invest', 'Portfolio', 0), { ...kpi, layout: { ...kpi.layout, y: 5 } }],
      },
    });
    expectStatus(put, 200);
    expect(put.data!.widgets.map((w) => [w.id, w.kind, w.title ?? null])).toEqual([
      ['h-invest', 'text', 'Portfolio'],
      ['kpi', 'report', null],
    ]);
    expect(put.data!.widgets[0].params ?? null).toBeNull();
  });

  test.describe('Validation Matrix', () => {
    const cases: Array<[string, ReturnType<typeof header> & Record<string, unknown>]> = [
      ['missing title', header('h', null, 0)],
      ['blank title', header('h', '   ', 0)],
      ['title over 120 characters', header('h', 'a'.repeat(121), 0)],
      ['narrower than the grid', header('h', 'A', 0, null, { x: 0, w: 50 })],
      ['not starting at column 0', header('h', 'A', 0, null, { x: 1, w: 99 })],
      ['unknown param', header('h', 'A', 0, { description: 'ok', color: 'red' })],
      ['non-text description', header('h', 'A', 0, { description: 5 })],
      ['description over 300 characters', header('h', 'A', 0, { description: 'd'.repeat(301) })],
      ['params not an object', { ...header('h', 'A', 0), params: ['x'] as unknown as Record<string, unknown> }],
      ['referencing a built-in', { ...header('h', 'A', 0), builtinKey: 'net_worth' }],
    ];

    for (const [name, bad] of cases) {
      test(`header ${name} -> 400`, async ({ api }) => {
        const res = await api.POST('/api/v1/dashboards', { body: { name: 'Bad header', isDefault: false, widgets: [bad as never] } });
        expectStatus(res, 400);
        expect(res.error?.code).toBe('VALIDATION_ERROR');
      });
    }

    test('header limits are inclusive: 120-char title and 300-char description save', async ({ api }) => {
      const res = await api.POST('/api/v1/dashboards', {
        body: { name: 'Max header', isDefault: false, widgets: [header('h', 'a'.repeat(120), 0, { description: 'd'.repeat(300) })] },
      });
      expectStatus(res, 201);
    });

    test('header referencing a report -> 400', async ({ api }) => {
      const report = await createReport(api, {
        name: 'Header Ref KPI',
        type: 'KPI',
        datasource: 'transactions',
        definition: { measure: 'amount', aggregation: 'sum', filters: [] },
      });
      const res = await api.POST('/api/v1/dashboards', {
        body: { name: 'Bad header', isDefault: false, widgets: [{ ...header('h', 'A', 0), reportId: report.id } as never] },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });
  });
});
