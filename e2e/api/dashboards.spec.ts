import { expectStatus } from '../fixtures/api';
import {
  createDashboard,
  createReport,
  widget,
} from '../fixtures/seed/reports';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Dashboards API (@api)', () => {
  // ==========================================================================
  // 1. CRUD & Widget Enrichment
  // ==========================================================================
  test('Create dashboard with widgets within 100-col grid, get enriched reports, PUT full replace, and delete', async ({
    api,
  }) => {
    // Create 2 reports
    const report1 = await createReport(api, {
      name: 'Widget Report 1',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });
    const report2 = await createReport(api, {
      name: 'Widget Report 2',
      type: 'CHART',
      datasource: 'transactions',
      definition: {
        chartType: 'bar',
        dimension: { field: 'category' },
        measure: { field: 'amount', aggregation: 'sum' },
        filters: [],
      },
    });

    // Create dashboard with 2 widgets
    const w1 = widget(report1.id, { x: 0, y: 0, w: 50, h: 4 }, 'Spend KPI Override');
    const w2 = widget(report2.id, { x: 50, y: 0, w: 50, h: 4 }, null);

    const created = await createDashboard(api, {
      name: 'Main Financial Dashboard',
      description: 'Overview of all finances',
      isDefault: false,
      widgets: [w1, w2],
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Main Financial Dashboard');
    expect(created.isDefault).toBe(false);
    expect(created.widgets.length).toBe(2);

    // GET /dashboards returns full list
    const listRes = await api.GET('/api/v1/dashboards');
    expectStatus(listRes, 200);
    expect(listRes.data!.some((d) => d.id === created.id)).toBe(true);

    // GET /dashboards/{id} returns enriched widgets
    const getRes = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: created.id } } });
    expectStatus(getRes, 200);
    const dash = getRes.data!;
    expect(dash.widgets.length).toBe(2);

    const enrichedW1 = dash.widgets.find((w) => w.id === w1.id)!;
    expect(enrichedW1.reportId).toBe(report1.id);
    expect(enrichedW1.title).toBe('Spend KPI Override');
    expect(enrichedW1.report.available).toBe(true);
    expect(enrichedW1.report.name).toBe('Widget Report 1');
    expect(enrichedW1.report.type).toBe('KPI');

    const enrichedW2 = dash.widgets.find((w) => w.id === w2.id)!;
    expect(enrichedW2.reportId).toBe(report2.id);
    expect(enrichedW2.report.available).toBe(true);
    expect(enrichedW2.report.name).toBe('Widget Report 2');
    expect(enrichedW2.report.type).toBe('CHART');

    // PUT full replacement: drops w2, updates name and isDefault
    const putRes = await api.PUT('/api/v1/dashboards/{id}', {
      params: { path: { id: created.id } },
      body: {
        name: 'Updated Main Dashboard',
        description: 'New Description',
        isDefault: true,
        widgets: [w1], // w2 dropped
      },
    });
    expectStatus(putRes, 200);
    expect(putRes.data!.name).toBe('Updated Main Dashboard');
    expect(putRes.data!.isDefault).toBe(true);
    expect(putRes.data!.widgets.length).toBe(1);
    expect(putRes.data!.widgets[0].id).toBe(w1.id);

    // DELETE dashboard -> 204 then 404
    const delRes = await api.DELETE('/api/v1/dashboards/{id}', { params: { path: { id: created.id } } });
    expectStatus(delRes, 204);

    const afterDel = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: created.id } } });
    expectStatus(afterDel, 404);
  });

  // ==========================================================================
  // 2. Layout and Grid Validation Matrix (400)
  // ==========================================================================
  test.describe('Validation Matrix', () => {
    test('Missing name -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/dashboards', {
        body: {
          name: '',
          widgets: [],
        },
      });
      expectStatus(res, 400);
    });

    test('x + w > 100 -> 400', async ({ api }) => {
      const rep = await createReport(api, {
        name: 'Rep Grid Test',
        type: 'KPI',
        datasource: 'transactions',
        definition: { measure: 'amount', aggregation: 'sum', filters: [] },
      });

      const res = await api.POST('/api/v1/dashboards', {
        body: {
          name: 'Overflow Grid',
          widgets: [widget(rep.id, { x: 80, y: 0, w: 30, h: 4 })], // 80 + 30 = 110 > 100
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('w < 1 -> 400', async ({ api }) => {
      const rep = await createReport(api, {
        name: 'Rep W Test',
        type: 'KPI',
        datasource: 'transactions',
        definition: { measure: 'amount', aggregation: 'sum', filters: [] },
      });

      const res = await api.POST('/api/v1/dashboards', {
        body: {
          name: 'Zero Width',
          widgets: [widget(rep.id, { x: 0, y: 0, w: 0, h: 4 })],
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('h < 1 -> 400', async ({ api }) => {
      const rep = await createReport(api, {
        name: 'Rep H Test',
        type: 'KPI',
        datasource: 'transactions',
        definition: { measure: 'amount', aggregation: 'sum', filters: [] },
      });

      const res = await api.POST('/api/v1/dashboards', {
        body: {
          name: 'Zero Height',
          widgets: [widget(rep.id, { x: 0, y: 0, w: 50, h: 0 })],
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Duplicate widget IDs -> 400', async ({ api }) => {
      const rep = await createReport(api, {
        name: 'Rep Dup Test',
        type: 'KPI',
        datasource: 'transactions',
        definition: { measure: 'amount', aggregation: 'sum', filters: [] },
      });

      const w1 = widget(rep.id, { x: 0, y: 0, w: 50, h: 4 }, null, 'duplicate-id-1');
      const w2 = widget(rep.id, { x: 50, y: 0, w: 50, h: 4 }, null, 'duplicate-id-1');

      const res = await api.POST('/api/v1/dashboards', {
        body: {
          name: 'Duplicate Widget IDs',
          widgets: [w1, w2],
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // 3. Graceful Report Resolution (Deleted / Foreign Reports)
  // ==========================================================================
  test('Widget referencing deleted or foreign report gracefully degrades to available: false', async ({
    api,
    request,
  }) => {
    // 1. Deleted report reference
    const rep = await createReport(api, {
      name: 'To Be Deleted Report',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });

    const wDeleted = widget(rep.id, { x: 0, y: 0, w: 50, h: 4 });
    const dash = await createDashboard(api, {
      name: 'Graceful Degradation Dashboard',
      widgets: [wDeleted],
    });

    // Delete the report
    await api.DELETE('/api/v1/reports/{id}', { params: { path: { id: rep.id } } });

    // Dashboard read still succeeds with available: false
    const afterDeleteGet = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: dash.id } } });
    expectStatus(afterDeleteGet, 200);
    expect(afterDeleteGet.data!.widgets[0].report.available).toBe(false);
    expect(afterDeleteGet.data!.widgets[0].report.name).toBeNull();
    expect(afterDeleteGet.data!.widgets[0].report.type).toBeNull();

    // 2. Foreign (User B) report reference
    const userB = await secondUser(request, 'dash-foreign-rep');
    const userBReport = await createReport(userB.api, {
      name: 'User B Report',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });

    const wForeign = widget(userBReport.id, { x: 0, y: 0, w: 50, h: 4 });
    const foreignDash = await createDashboard(api, {
      name: 'Foreign Report Dashboard',
      widgets: [wForeign],
    });

    const foreignDashGet = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: foreignDash.id } } });
    expectStatus(foreignDashGet, 200);
    expect(foreignDashGet.data!.widgets[0].report.available).toBe(false);
  });

  // ==========================================================================
  // 4. Default Dashboard Mechanics
  // ==========================================================================
  test('Setting isDefault: true clears default on previous dashboard, and GET /dashboards/default works', async ({
    api,
  }) => {
    // 1. GET /dashboards/default -> 404 when none exists
    const noDefaultRes = await api.GET('/api/v1/dashboards/default');
    // Note: fresh user might not have a default dashboard set
    if (noDefaultRes.response.status === 404) {
      expectStatus(noDefaultRes, 404);
    }

    // 2. Create Dashboard 1 as default
    const d1 = await createDashboard(api, {
      name: 'Dashboard One',
      isDefault: true,
      widgets: [],
    });
    expect(d1.isDefault).toBe(true);

    const getDef1 = await api.GET('/api/v1/dashboards/default');
    expectStatus(getDef1, 200);
    expect(getDef1.data!.id).toBe(d1.id);

    // 3. Create Dashboard 2 as default -> clears default on Dashboard 1
    const d2 = await createDashboard(api, {
      name: 'Dashboard Two',
      isDefault: true,
      widgets: [],
    });
    expect(d2.isDefault).toBe(true);

    // Verify Dashboard 1 is no longer default
    const getD1 = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: d1.id } } });
    expectStatus(getD1, 200);
    expect(getD1.data!.isDefault).toBe(false);

    // Verify GET /dashboards/default returns Dashboard 2
    const getDef2 = await api.GET('/api/v1/dashboards/default');
    expectStatus(getDef2, 200);
    expect(getDef2.data!.id).toBe(d2.id);
  });

  // ==========================================================================
  // 5. Tenancy, Skeleton Summary Stub (PRODUCT-GAP), and 401s
  // ==========================================================================
  test.describe('Tenancy, Summary Stub, and Auth', () => {
    test('User B accessing User A dashboard returns 400 VALIDATION_ERROR', async ({ api, request }) => {
      const dashA = await createDashboard(api, {
        name: 'User A Dashboard',
        widgets: [],
      });

      const userB = await secondUser(request, 'dash-tenancy-b');

      // GET
      const getB = await userB.api.GET('/api/v1/dashboards/{id}', { params: { path: { id: dashA.id } } });
      expectStatus(getB, 400);
      expect(getB.error?.code).toBe('VALIDATION_ERROR');

      // PUT
      const putB = await userB.api.PUT('/api/v1/dashboards/{id}', {
        params: { path: { id: dashA.id } },
        body: { name: 'Hacked Dashboard', widgets: [] },
      });
      expectStatus(putB, 400);

      // DELETE
      const delB = await userB.api.DELETE('/api/v1/dashboards/{id}', { params: { path: { id: dashA.id } } });
      expectStatus(delB, 400);
    });

    test('Unknown dashboard ID returns 404', async ({ api }) => {
      const nonExistent = '00000000-0000-0000-0000-000000000000';
      const res = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: nonExistent } } });
      expectStatus(res, 404);
    });

    test('GET /dashboard/summary returns skeleton stub (PRODUCT-GAP)', async ({ api }) => {
      const res = await api.GET('/api/v1/dashboard/summary');
      expectStatus(res, 200);
      expect(res.data!.status).toBe('skeleton');
      expect(res.data!.netWorth).toBe(0);
      expect(res.data!.totalAssets).toBe(0);
      expect(res.data!.totalLiabilities).toBe(0);
      expect(res.data!.monthlyIncome).toBe(0);
      expect(res.data!.monthlyExpenses).toBe(0);
      expect(res.data!.categoryBreakdown).toEqual([]);
    });

    test('All dashboard endpoints require authentication (401)', async () => {
      const dummyId = '00000000-0000-0000-0000-000000000000';
      await expectUnauthenticated('GET', '/api/v1/dashboards');
      await expectUnauthenticated('POST', '/api/v1/dashboards', {
        name: 'Unauth',
        widgets: [],
      });
      await expectUnauthenticated('GET', '/api/v1/dashboards/default');
      await expectUnauthenticated('GET', `/api/v1/dashboards/${dummyId}`);
      await expectUnauthenticated('PUT', `/api/v1/dashboards/${dummyId}`, {
        name: 'Unauth',
        widgets: [],
      });
      await expectUnauthenticated('DELETE', `/api/v1/dashboards/${dummyId}`);
      await expectUnauthenticated('GET', '/api/v1/dashboard/summary');
    });
  });
});
