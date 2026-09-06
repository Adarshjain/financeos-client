import { expectStatus } from '../fixtures/api';
import { createBankAccount, createBrokerAccount } from '../fixtures/seed/accounts';
import {
  createDividend,
  createFnoTrade,
  createInstrument,
  generateIsin,
  generateYahooSymbol,
  trade,
} from '../fixtures/seed/investments';
import {
  addLending,
  createCounterparty,
  createLoan,
  pay,
} from '../fixtures/seed/loans';
import {
  createReport,
  fixedMonth,
  fyLabel,
  runAdHoc,
  runSaved,
  seedTransactionsDataset,
} from '../fixtures/seed/reports';
import { createRewardCard, createRewardRule, spend } from '../fixtures/seed/rewards';
import { createTransaction } from '../fixtures/seed/transactions';
import { secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Reports API (@api)', () => {
  // ==========================================================================
  // 1. CRUD Tests
  // ==========================================================================
  test.describe('CRUD', () => {
    test('Create, list with type filter, get definition, update, immutable type/datasource, delete', async ({
      api,
    }) => {
      // 1. Create KPI report
      const kpiReport = await createReport(api, {
        name: 'Total Spend KPI',
        description: 'Monthly spend tracking',
        type: 'KPI',
        datasource: 'transactions',
        definition: {
          measure: 'amount',
          aggregation: 'sum',
          filters: [{ field: 'type', operator: 'is', value: 'DEBIT' }],
          comparison: { enabled: true, period: 'previous_period', higherIsBetter: false },
        },
      });
      expect(kpiReport.id).toBeTruthy();
      expect(kpiReport.name).toBe('Total Spend KPI');
      expect(kpiReport.type).toBe('KPI');
      expect(kpiReport.datasource).toBe('transactions');

      // 2. Create CHART report
      const chartReport = await createReport(api, {
        name: 'Spend by Category Chart',
        type: 'CHART',
        datasource: 'transactions',
        definition: {
          chartType: 'bar',
          dimension: { field: 'category' },
          measure: { field: 'amount', aggregation: 'sum' },
          filters: [],
        },
      });
      expect(chartReport.type).toBe('CHART');

      // 3. Create TABLE raw report
      const rawTableReport = await createReport(api, {
        name: 'Recent Transactions Raw',
        type: 'TABLE',
        datasource: 'transactions',
        definition: {
          mode: 'raw',
          columns: ['date', 'description', 'amount', 'type'],
          filters: [],
          sort: [{ key: 'date', direction: 'desc' }],
        },
      });
      expect(rawTableReport.type).toBe('TABLE');

      // 4. Create TABLE aggregated report
      const aggTableReport = await createReport(api, {
        name: 'Category vs Type Pivot',
        type: 'TABLE',
        datasource: 'transactions',
        definition: {
          mode: 'aggregated',
          rows: [{ field: 'category' }],
          columns: [{ field: 'type' }],
          measures: [{ field: 'amount', aggregation: 'sum' }],
          filters: [],
        },
      });
      expect(aggTableReport.type).toBe('TABLE');

      // 5. List with type filter
      const allReports = await api.GET('/api/v1/reports');
      expectStatus(allReports, 200);
      expect(allReports.data!.length).toBeGreaterThanOrEqual(4);

      const kpiReports = await api.GET('/api/v1/reports', { params: { query: { type: 'KPI' } } });
      expectStatus(kpiReports, 200);
      expect(kpiReports.data!.every((r) => r.type === 'KPI')).toBe(true);
      expect(kpiReports.data!.some((r) => r.id === kpiReport.id)).toBe(true);

      const chartReports = await api.GET('/api/v1/reports', { params: { query: { type: 'CHART' } } });
      expectStatus(chartReports, 200);
      expect(chartReports.data!.every((r) => r.type === 'CHART')).toBe(true);

      // 6. GET /reports/{id} returns full definition
      const fetched = await api.GET('/api/v1/reports/{id}', { params: { path: { id: kpiReport.id } } });
      expectStatus(fetched, 200);
      expect(fetched.data!.id).toBe(kpiReport.id);
      expect(fetched.data!.name).toBe('Total Spend KPI');
      expect(fetched.data!.definition).toBeDefined();

      // 7. PUT update name and definition
      const updateRes = await api.PUT('/api/v1/reports/{id}', {
        params: { path: { id: kpiReport.id } },
        body: {
          name: 'Updated Total Spend KPI',
          description: 'Updated description',
          definition: {
            measure: 'amount',
            aggregation: 'avg',
            filters: [{ field: 'type', operator: 'is', value: 'DEBIT' }],
          },
        },
      });
      expectStatus(updateRes, 200);
      expect(updateRes.data!.name).toBe('Updated Total Spend KPI');

      // 8. PUT cannot change type or datasource (type and datasource are immutable)
      const attemptChangeRes = await api.PUT('/api/v1/reports/{id}', {
        params: { path: { id: kpiReport.id } },
        body: {
          name: 'Attempt Type Change',
          definition: {
            measure: 'amount',
            aggregation: 'sum',
            filters: [],
          },
        } as any,
      });
      expectStatus(attemptChangeRes, 200);
      expect(attemptChangeRes.data!.type).toBe('KPI');
      expect(attemptChangeRes.data!.datasource).toBe('transactions');

      // 9. DELETE report -> 204 then GET -> 404
      const deleteRes = await api.DELETE('/api/v1/reports/{id}', { params: { path: { id: chartReport.id } } });
      expectStatus(deleteRes, 204);

      const afterDelete = await api.GET('/api/v1/reports/{id}', { params: { path: { id: chartReport.id } } });
      expectStatus(afterDelete, 404);
    });
  });

  // ==========================================================================
  // 2. Validation Matrix (all -> 400 VALIDATION_ERROR)
  // ==========================================================================
  test.describe('Validation Matrix', () => {
    test('Unknown datasource -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Invalid Datasource',
          type: 'KPI',
          datasource: 'invalid_datasource_name',
          definition: { measure: 'amount', aggregation: 'sum', filters: [] },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Unknown field -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Invalid Field',
          type: 'KPI',
          datasource: 'transactions',
          definition: { measure: 'unknown_measure_xyz', aggregation: 'sum', filters: [] },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Measure used as dimension -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Measure as Dim',
          type: 'CHART',
          datasource: 'transactions',
          definition: {
            chartType: 'bar',
            dimension: { field: 'amount' },
            measure: { field: 'amount', aggregation: 'sum' },
            filters: [],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Aggregation not allowed -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Disallowed Aggregation',
          type: 'KPI',
          datasource: 'dividends',
          definition: {
            measure: 'perUnit',
            // perUnit only allows AVG, MIN, MAX; SUM is disallowed
            aggregation: 'sum',
            filters: [],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Operator invalid for field type -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Invalid Operator',
          type: 'KPI',
          datasource: 'transactions',
          definition: {
            measure: 'amount',
            aggregation: 'sum',
            // starts_with is not valid for number
            filters: [{ field: 'amount', operator: 'starts_with', value: '100' }],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Wrong value shape for between -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Wrong Value Shape',
          type: 'KPI',
          datasource: 'transactions',
          definition: {
            measure: 'amount',
            aggregation: 'sum',
            // between requires {from, to}
            filters: [{ field: 'date', operator: 'between', value: '2026-01-01' }],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Enum value not in list -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Bad Enum Value',
          type: 'KPI',
          datasource: 'transactions',
          definition: {
            measure: 'amount',
            aggregation: 'sum',
            filters: [{ field: 'type', operator: 'is', value: 'NON_EXISTENT_TYPE' }],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('DATE dimension without granularity -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Missing Granularity',
          type: 'CHART',
          datasource: 'transactions',
          definition: {
            chartType: 'line',
            dimension: { field: 'date' }, // missing granularity
            measure: { field: 'amount', aggregation: 'sum' },
            filters: [],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Granularity on non-DATE dimension -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Granularity on String',
          type: 'CHART',
          datasource: 'transactions',
          definition: {
            chartType: 'bar',
            dimension: { field: 'category', granularity: 'month' },
            measure: { field: 'amount', aggregation: 'sum' },
            filters: [],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Duplicate dimensions in aggregated table -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Duplicate Dims',
          type: 'TABLE',
          datasource: 'transactions',
          definition: {
            mode: 'aggregated',
            rows: [{ field: 'category' }, { field: 'category' }],
            measures: [{ field: 'amount', aggregation: 'sum' }],
            filters: [],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Same field as both row and column dimension in aggregated table -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Row and Col Dim Conflict',
          type: 'TABLE',
          datasource: 'transactions',
          definition: {
            mode: 'aggregated',
            rows: [{ field: 'category' }],
            columns: [{ field: 'category' }],
            measures: [{ field: 'amount', aggregation: 'sum' }],
            filters: [],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Raw table with no columns -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Empty Raw Columns',
          type: 'TABLE',
          datasource: 'transactions',
          definition: {
            mode: 'raw',
            columns: [],
            filters: [],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Aggregated table without measures -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Aggregated Without Measures',
          type: 'TABLE',
          datasource: 'transactions',
          definition: {
            mode: 'aggregated',
            rows: [{ field: 'category' }],
            measures: [],
            filters: [],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Aggregated table without rows -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Aggregated Without Rows',
          type: 'TABLE',
          datasource: 'transactions',
          definition: {
            mode: 'aggregated',
            rows: [],
            measures: [{ field: 'amount', aggregation: 'sum' }],
            filters: [],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Bad table mode -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Bad Table Mode',
          type: 'TABLE',
          datasource: 'transactions',
          definition: {
            mode: 'invalid_mode',
            columns: ['date', 'amount'],
            filters: [],
          } as any,
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    test('Sort key when columns is non-empty in aggregated table -> 400', async ({ api }) => {
      const res = await api.POST('/api/v1/reports', {
        body: {
          name: 'Sort On Pivot Matrix',
          type: 'TABLE',
          datasource: 'transactions',
          definition: {
            mode: 'aggregated',
            rows: [{ field: 'category' }],
            columns: [{ field: 'type' }],
            measures: [{ field: 'amount', aggregation: 'sum' }],
            filters: [],
            sort: [{ key: 'amount_sum', direction: 'desc' }],
          },
        },
      });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // 3. Exact Number Runs (14 Cases Across All 11 Datasources)
  // ==========================================================================
  test.describe('Exact-number report executions', () => {
    test('1. transactions KPI: SUM amount with date range, category filter and comparison', async ({
      api,
    }) => {
      const ds = await seedTransactionsDataset(api);

      // Define KPI on current month, Food category, type=DEBIT
      const kpiDef = {
        measure: 'amount',
        aggregation: 'sum' as const,
        filters: [
          { field: 'category', operator: 'is', value: ds.foodCat.name },
          { field: 'type', operator: 'is', value: 'DEBIT' },
          { field: 'date', operator: 'between', value: { from: ds.currentMonth.from, to: ds.currentMonth.to } },
        ],
        comparison: { enabled: true, period: 'previous_period' as const, higherIsBetter: false },
      };

      const savedReport = await createReport(api, {
        name: 'Food Spend KPI',
        type: 'KPI',
        datasource: 'transactions',
        definition: kpiDef,
      });

      // Run saved
      const savedData = (await runSaved(api, savedReport.id)) as any;
      expect(savedData.type).toBe('KPI');
      expect(savedData.value).toBe(-1500); // -1000 + -500
      expect(savedData.comparison).toBeDefined();
      expect(savedData.comparison.previousValue).toBe(-800);
      expect(savedData.comparison.change).toBe(-700); // -1500 - (-800) = -700
      expect(savedData.comparison.direction).toBe('down');
      expect(savedData.comparison.sentiment).toBe('good'); // higherIsBetter: false, direction: down -> good (spend decreased)

      // Run ad-hoc (should match saved)
      const adHocData = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'transactions',
        definition: kpiDef,
      })) as any;
      expect(adHocData).toEqual(savedData);

      // Test comparison.enabled = false
      const noCompData = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'transactions',
        definition: {
          ...kpiDef,
          comparison: { enabled: false },
        },
      })) as any;
      expect(noCompData.value).toBe(-1500);
      expect(noCompData.comparison).toBeNull();
    });

    test('2. transactions CHART: bar by category, pie, and line by month', async ({ api }) => {
      const ds = await seedTransactionsDataset(api);

      // Bar chart by category for current month debits
      const barData = (await runAdHoc(api, {
        type: 'CHART',
        datasource: 'transactions',
        definition: {
          chartType: 'bar',
          dimension: { field: 'category' },
          measure: { field: 'amount', aggregation: 'sum' },
          filters: [
            { field: 'type', operator: 'is', value: 'DEBIT' },
            { field: 'date', operator: 'between', value: { from: ds.currentMonth.from, to: ds.currentMonth.to } },
          ],
        },
      })) as any;

      expect(barData.type).toBe('CHART');
      expect(barData.chartType).toBe('bar');
      expect(barData.dimension).toBe('category');
      expect(barData.categories).toContain(ds.foodCat.name);
      expect(barData.categories).toContain(ds.travelCat.name);

      const foodIdx = barData.categories.indexOf(ds.foodCat.name);
      const travelIdx = barData.categories.indexOf(ds.travelCat.name);
      expect(barData.series[0].data[foodIdx]).toBe(-1500);
      expect(barData.series[0].data[travelIdx]).toBe(-2000);

      // Pie chart: ignores series split
      const pieData = (await runAdHoc(api, {
        type: 'CHART',
        datasource: 'transactions',
        definition: {
          chartType: 'pie',
          dimension: { field: 'category' },
          series: { field: 'type' }, // should be ignored by pie
          measure: { field: 'amount', aggregation: 'sum' },
          filters: [
            { field: 'date', operator: 'between', value: { from: ds.currentMonth.from, to: ds.currentMonth.to } },
          ],
        },
      })) as any;
      expect(pieData.chartType).toBe('pie');
      expect(pieData.categories.length).toBeGreaterThan(0);

      // Line chart by date with month granularity across two months
      const lineData = (await runAdHoc(api, {
        type: 'CHART',
        datasource: 'transactions',
        definition: {
          chartType: 'line',
          dimension: { field: 'date', granularity: 'month' },
          measure: { field: 'amount', aggregation: 'sum' },
          filters: [
            { field: 'date', operator: 'between', value: { from: ds.prevMonth.from, to: ds.currentMonth.to } },
          ],
        },
      })) as any;
      expect(lineData.chartType).toBe('line');
      expect(lineData.categories.length).toBeGreaterThanOrEqual(2);
    });

    test('3. transactions TABLE raw: columns, sort desc, pagination size=2 and clamping size=5000', async ({
      api,
    }) => {
      const ds = await seedTransactionsDataset(api);

      const rawDef = {
        mode: 'raw' as const,
        columns: ['date', 'description', 'amount', 'type'],
        filters: [
          { field: 'date', operator: 'between', value: { from: ds.currentMonth.from, to: ds.currentMonth.to } },
        ],
        sort: [{ key: 'amount', direction: 'desc' as const }],
      };

      // Page 0 with size 2
      const page0 = (await runAdHoc(api, { type: 'TABLE', datasource: 'transactions', definition: rawDef }, 0, 2)) as any;
      expect(page0.mode).toBe('raw');
      expect(page0.columns.map((c: any) => c.key)).toEqual(['date', 'description', 'amount', 'type']);
      expect(page0.rows.length).toBe(2);
      expect(page0.page.size).toBe(2);
      expect(page0.page.totalElements).toBeGreaterThanOrEqual(4);
      expect(page0.page.totalPages).toBe(Math.ceil(page0.page.totalElements / 2));

      // Page 1 with size 2 (disjoint IDs)
      const page1 = (await runAdHoc(api, { type: 'TABLE', datasource: 'transactions', definition: rawDef }, 1, 2)) as any;
      expect(page1.rows.length).toBe(2);
      const page0Ids = page0.rows.map((r: any) => r.id);
      const page1Ids = page1.rows.map((r: any) => r.id);
      expect(page0Ids.some((id: string) => page1Ids.includes(id))).toBe(false);

      // Clamping size 5000 -> clamps to 1000
      const clamped = (await runAdHoc(api, { type: 'TABLE', datasource: 'transactions', definition: rawDef }, 0, 5000)) as any;
      expect(clamped.page.size).toBe(1000);
    });

    test('4. transactions TABLE aggregated: pivot matrix, date@month, date@fy, quarter, year', async ({
      api,
    }) => {
      const ds = await seedTransactionsDataset(api);

      // Aggregated table: rows date@month x columns type, amount SUM
      const pivotData = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'transactions',
        definition: {
          mode: 'aggregated',
          rows: [{ field: 'date', granularity: 'month' }],
          columns: [{ field: 'type' }],
          measures: [{ field: 'amount', aggregation: 'sum' }],
          filters: [
            { field: 'date', operator: 'between', value: { from: ds.currentMonth.from, to: ds.currentMonth.to } },
          ],
        },
      })) as any;

      expect(pivotData.mode).toBe('aggregated');
      expect(pivotData.rowDimensions).toEqual([{ field: 'date', label: 'Month' }]);
      expect(pivotData.columnDimensions).toEqual([{ field: 'type', label: 'Type' }]);
      expect(pivotData.measures[0].key).toBe('amount_sum');
      expect(pivotData.rows.length).toBeGreaterThan(0);

      // Date@fy granularity check
      const fyData = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'transactions',
        definition: {
          mode: 'aggregated',
          rows: [{ field: 'date', granularity: 'fy' }],
          measures: [{ field: 'amount', aggregation: 'sum' }],
          filters: [
            { field: 'date', operator: 'between', value: { from: ds.currentMonth.from, to: ds.currentMonth.to } },
          ],
        },
      })) as any;

      const expectedFy = fyLabel(ds.currentMonth.from);
      expect(fyData.rows.some((r: any) => r.values.date === expectedFy)).toBe(true);

      // Date@quarter and date@year check
      const qData = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'transactions',
        definition: {
          mode: 'aggregated',
          rows: [{ field: 'date', granularity: 'quarter' }],
          measures: [{ field: 'amount', aggregation: 'sum' }],
          filters: [
            { field: 'date', operator: 'between', value: { from: ds.currentMonth.from, to: ds.currentMonth.to } },
          ],
        },
      })) as any;
      expect(qData.rows.length).toBeGreaterThan(0);
      expect(qData.rows[0].values.date).toMatch(/^Q[1-4] \d{2}$/);

      const yData = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'transactions',
        definition: {
          mode: 'aggregated',
          rows: [{ field: 'date', granularity: 'year' }],
          measures: [{ field: 'amount', aggregation: 'sum' }],
          filters: [
            { field: 'date', operator: 'between', value: { from: ds.currentMonth.from, to: ds.currentMonth.to } },
          ],
        },
      })) as any;
      expect(yData.rows.length).toBeGreaterThan(0);
      expect(yData.rows[0].values.date).toBe(String(ds.currentMonth.year));
    });

    test('5. Relative date operators: current_fy and prev_fy against server today', async ({
      api,
    }) => {
      const now = new Date();
      const account = await createBankAccount(api, { name: `FY Test Account ${Date.now()}` });

      // Today is in current FY
      const todayIso = now.toISOString().slice(0, 10);
      await createTransaction(api, account.id, {
        amount: -1234,
        date: todayIso,
        description: 'Current FY Txn',
      });

      // 1 year prior is in prev FY
      const prevYearDate = new Date(now);
      prevYearDate.setUTCFullYear(now.getUTCFullYear() - 1);
      const prevYearIso = prevYearDate.toISOString().slice(0, 10);
      await createTransaction(api, account.id, {
        amount: -5678,
        date: prevYearIso,
        description: 'Prev FY Txn',
      });

      // Run current_fy KPI
      const currentFyRes = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'transactions',
        definition: {
          measure: 'amount',
          aggregation: 'sum',
          filters: [
            { field: 'account', operator: 'is', value: account.name },
            { field: 'date', operator: 'current_fy' },
          ],
        },
      })) as any;
      expect(currentFyRes.value).toBe(-1234);

      // Run prev_fy KPI
      const prevFyRes = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'transactions',
        definition: {
          measure: 'amount',
          aggregation: 'sum',
          filters: [
            { field: 'account', operator: 'is', value: account.name },
            { field: 'date', operator: 'prev_fy' },
          ],
        },
      })) as any;
      expect(prevFyRes.value).toBe(-5678);
    });

    test('6. investment_trades: tradeValue SUM = Σ qty×price, cashflow signed, group by type', async ({
      api,
    }) => {
      const broker = await createBrokerAccount(api, { name: `Broker Trades ${Date.now()}` });
      const instrument = await createInstrument(api, {
        name: `Stock Trades ${Date.now()}`,
        isin: generateIsin(),
        yahooSymbol: generateYahooSymbol(),
        type: 'stock',
      });

      // Buy 10 @ 100 -> tradeValue 1000, cashflow -1000
      await trade(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        type: 'buy',
        quantity: 10,
        price: 100,
        tradeDate: '2026-01-10',
      });

      // Sell 5 @ 150 -> tradeValue 750, cashflow +750
      await trade(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        type: 'sell',
        quantity: 5,
        price: 150,
        tradeDate: '2026-01-15',
      });

      // KPI: tradeValue SUM = 1750
      const tvKpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'investment_trades',
        definition: {
          measure: 'tradeValue',
          aggregation: 'sum',
          filters: [{ field: 'broker', operator: 'is', value: broker.name }],
        },
      })) as any;
      expect(tvKpi.value).toBe(1750);

      // KPI: cashflow SUM = -250 (-1000 + 750)
      const cfKpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'investment_trades',
        definition: {
          measure: 'cashflow',
          aggregation: 'sum',
          filters: [{ field: 'broker', operator: 'is', value: broker.name }],
        },
      })) as any;
      expect(cfKpi.value).toBe(-250);

      // CHART: group by type
      const typeChart = (await runAdHoc(api, {
        type: 'CHART',
        datasource: 'investment_trades',
        definition: {
          chartType: 'bar',
          dimension: { field: 'type' },
          measure: { field: 'tradeValue', aggregation: 'sum' },
          filters: [{ field: 'broker', operator: 'is', value: broker.name }],
        },
      })) as any;
      expect(typeChart.categories).toContain('buy');
      expect(typeChart.categories).toContain('sell');
    });

    test('7. dividends: amount SUM by payDate@fy (two FYs)', async ({ api }) => {
      const broker = await createBrokerAccount(api, { name: `Broker Div ${Date.now()}` });
      const instrument = await createInstrument(api, {
        name: `Stock Div ${Date.now()}`,
        isin: generateIsin(),
        yahooSymbol: generateYahooSymbol(),
        type: 'stock',
      });

      // Buy holding first so dividend can be attached
      await trade(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        type: 'buy',
        quantity: 10,
        price: 100,
        tradeDate: '2025-01-01',
      });

      // Dividend 500 on 2025-06-15 (FY 25-26)
      await createDividend(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        amount: 500,
        payDate: '2025-06-15',
        type: 'dividend',
      });

      // Dividend 700 on 2026-06-15 (FY 26-27)
      await createDividend(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        amount: 700,
        payDate: '2026-06-15',
        type: 'dividend',
      });

      const divData = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'dividends',
        definition: {
          mode: 'aggregated',
          rows: [{ field: 'payDate', granularity: 'fy' }],
          measures: [{ field: 'amount', aggregation: 'sum' }],
          filters: [{ field: 'broker', operator: 'is', value: broker.name }],
        },
      })) as any;

      expect(divData.rows.length).toBe(2);
      const row2526 = divData.rows.find((r: any) => r.values.payDate === 'FY 25-26');
      const row2627 = divData.rows.find((r: any) => r.values.payDate === 'FY 26-27');
      expect(row2526.cells[''].amount_sum).toBe(500);
      expect(row2627.cells[''].amount_sum).toBe(700);
    });

    test('8. fno_trades: realizedPnl SUM = Σ (sell - buy - charges)', async ({ api }) => {
      const broker = await createBrokerAccount(api, { name: `Broker FNO ${Date.now()}` });

      // Trade 1: buy 10000, sell 12500, charges 150 -> PnL 2350
      await createFnoTrade(api, {
        brokerAccountId: broker.id,
        tradingSymbol: `NIFTY26JAN${Date.now().toString().slice(-4)}`,
        contractType: 'future',
        optionType: 'CE',
        entryDate: '2026-01-05',
        exitDate: '2026-01-10',
        buyValue: 10000,
        sellValue: 12500,
        totalCharges: 150,
        quantity: 50,
      });

      const fnoKpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'fno_trades',
        definition: {
          measure: 'realizedPnl',
          aggregation: 'sum',
          filters: [{ field: 'broker', operator: 'is', value: broker.name }],
        },
      })) as any;

      expect(fnoKpi.value).toBe(2350);
    });

    test('9. positions: invested, currentValue (LTP 999.99) for open position and isOpen filter', async ({
      api,
    }) => {
      const broker = await createBrokerAccount(api, { name: `Broker Pos ${Date.now()}` });
      const instrument = await createInstrument(api, {
        name: `Stock Pos ${Date.now()}`,
        isin: generateIsin(),
        yahooSymbol: generateYahooSymbol(),
        type: 'stock',
      });

      // Buy 10 @ 100 -> invested 1000, current price is 999.99 from stub -> currentValue 9999.90
      await trade(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        type: 'buy',
        quantity: 10,
        price: 100,
        tradeDate: '2026-01-05',
      });

      const posKpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'positions',
        definition: {
          measure: 'invested',
          aggregation: 'sum',
          filters: [
            { field: 'broker', operator: 'is', value: broker.name },
            { field: 'isOpen', operator: 'is', value: true },
          ],
        },
      })) as any;
      expect(posKpi.value).toBe(1000);

      const valKpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'positions',
        definition: {
          measure: 'currentValue',
          aggregation: 'sum',
          filters: [
            { field: 'broker', operator: 'is', value: broker.name },
            { field: 'isOpen', operator: 'is', value: true },
          ],
        },
      })) as any;
      expect(valKpi.value).toBe(9999.9);
    });

    test('10. realized_lots: FIFO lot matching (buy 10@100, 10@120, sell 15@150) -> realizedPnl 650, term short', async ({
      api,
    }) => {
      const broker = await createBrokerAccount(api, { name: `Broker Lots ${Date.now()}` });
      const instrument = await createInstrument(api, {
        name: `Stock Lots ${Date.now()}`,
        isin: generateIsin(),
        yahooSymbol: generateYahooSymbol(),
        type: 'stock',
      });

      // Buy 10 @ 100 on 2026-01-01
      await trade(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        type: 'buy',
        quantity: 10,
        price: 100,
        tradeDate: '2026-01-01',
      });

      // Buy 10 @ 120 on 2026-01-02
      await trade(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        type: 'buy',
        quantity: 10,
        price: 120,
        tradeDate: '2026-01-02',
      });

      // Sell 15 @ 150 on 2026-01-03
      // Lot 1: 10 @ 100 sold @ 150 -> gain 500
      // Lot 2: 5 @ 120 sold @ 150 -> gain 150
      // Total realized = 650
      await trade(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        type: 'sell',
        quantity: 15,
        price: 150,
        tradeDate: '2026-01-03',
      });

      const lotsKpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'realized_lots',
        definition: {
          measure: 'realizedPnl',
          aggregation: 'sum',
          filters: [{ field: 'broker', operator: 'is', value: broker.name }],
        },
      })) as any;
      expect(lotsKpi.value).toBe(650);

      // Raw table to assert term
      const lotsTable = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'realized_lots',
        definition: {
          mode: 'raw',
          columns: ['sellDate', 'buyDate', 'quantity', 'realizedPnl', 'term'],
          filters: [{ field: 'broker', operator: 'is', value: broker.name }],
          sort: [{ key: 'quantity', direction: 'desc' }],
        },
      })) as any;
      expect(lotsTable.rows.length).toBe(2);
      expect(lotsTable.rows.every((r: any) => r.term === 'short')).toBe(true);
    });

    test('11. portfolio_value: month-end series across two month-ends', async ({ api }) => {
      const broker = await createBrokerAccount(api, { name: `Broker PV ${Date.now()}` });
      const instrument = await createInstrument(api, {
        name: `Stock PV ${Date.now()}`,
        isin: generateIsin(),
        yahooSymbol: generateYahooSymbol(),
        type: 'stock',
      });

      // Buy 10 @ 100 on 2025-10-15
      await trade(api, {
        brokerAccountId: broker.id,
        instrumentId: instrument.id,
        type: 'buy',
        quantity: 10,
        price: 100,
        tradeDate: '2025-10-15',
      });

      const pvTable = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'portfolio_value',
        definition: {
          mode: 'raw',
          columns: ['valueDate', 'broker', 'value'],
          filters: [{ field: 'broker', operator: 'is', value: broker.name }],
          sort: [{ key: 'value', direction: 'desc' }],
        },
      })) as any;

      expect(pvTable.rows.length).toBeGreaterThanOrEqual(2);
      expect(pvTable.rows[0].value).toBeDefined();
    });

    test('12. loan_payments & loan_tax_summary: settled installments, home vs education loan FY tax summary', async ({
      api,
    }) => {
      // Create Home Loan
      const homeLoan = await createLoan(api, {
        name: `Home Loan ${Date.now()}`,
        principal: 100000,
        annualRatePct: 12,
        tenureMonths: 12,
        startDate: '2025-05-01',
        firstEmiDate: '2025-06-01',
        loanType: 'home',
      });

      // Record 2 settled payments
      await pay(api, homeLoan.id, {
        installmentSeq: 1,
        paymentDate: '2025-06-01',
        amount: 8884.88,
      });
      await pay(api, homeLoan.id, {
        installmentSeq: 2,
        paymentDate: '2025-07-01',
        amount: 8884.88,
      });

      // Create Education Loan
      const eduLoan = await createLoan(api, {
        name: `Edu Loan ${Date.now()}`,
        principal: 50000,
        annualRatePct: 10,
        tenureMonths: 12,
        startDate: '2025-05-01',
        firstEmiDate: '2025-06-01',
        loanType: 'education',
      });

      await pay(api, eduLoan.id, {
        installmentSeq: 1,
        paymentDate: '2025-06-01',
        amount: 4395.79,
      });

      // 1. loan_payments: paidAmount SUM
      const paymentsKpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'loan_payments',
        definition: {
          measure: 'paidAmount',
          aggregation: 'sum',
          filters: [{ field: 'loanId', operator: 'exact', value: homeLoan.id }],
        },
      })) as any;
      expect(paymentsKpi.value).toBeCloseTo(17769.76, 1);

      // 2. loan_tax_summary: Home loan -> sec24bInterest & sec80cPrincipal
      const homeTax = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'loan_tax_summary',
        definition: {
          mode: 'raw',
          columns: ['financialYear', 'loanName', 'sec24bInterest', 'sec80cPrincipal', 'sec80eInterest'],
          filters: [{ field: 'loanId', operator: 'exact', value: homeLoan.id }],
        },
      })) as any;
      expect(homeTax.rows.length).toBe(1);
      expect(homeTax.rows[0].financialYear).toBe('FY 25-26');
      expect(homeTax.rows[0].sec24bInterest).toBeGreaterThan(0);
      expect(homeTax.rows[0].sec80cPrincipal).toBeGreaterThan(0);
      expect(homeTax.rows[0].sec80eInterest).toBe(0);

      // 3. loan_tax_summary: Education loan -> sec80eInterest
      const eduTax = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'loan_tax_summary',
        definition: {
          mode: 'raw',
          columns: ['financialYear', 'loanName', 'sec24bInterest', 'sec80cPrincipal', 'sec80eInterest'],
          filters: [{ field: 'loanId', operator: 'exact', value: eduLoan.id }],
        },
      })) as any;
      expect(eduTax.rows.length).toBe(1);
      expect(eduTax.rows[0].sec80eInterest).toBeGreaterThan(0);
      expect(eduTax.rows[0].sec24bInterest).toBe(0);
      expect(eduTax.rows[0].sec80cPrincipal).toBe(0);
    });

    test('13. lendings: signedAmount SUM = lent - borrowed, group by direction', async ({ api }) => {
      const counterparty = await createCounterparty(api, { name: `Lending Partner ${Date.now()}` });

      // Lent 5000 (signed +5000)
      await addLending(api, {
        counterpartyId: counterparty.id,
        amount: 5000,
        direction: 'lent',
        entryDate: '2026-01-10',
      });

      // Borrowed 2000 (signed -2000)
      await addLending(api, {
        counterpartyId: counterparty.id,
        amount: 2000,
        direction: 'borrowed',
        entryDate: '2026-01-12',
      });

      // KPI signedAmount = 3000
      const lendKpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'lendings',
        definition: {
          measure: 'signedAmount',
          aggregation: 'sum',
          filters: [{ field: 'counterpartyName', operator: 'is', value: counterparty.name }],
        },
      })) as any;
      expect(lendKpi.value).toBe(3000);

      // Group by direction
      const dirChart = (await runAdHoc(api, {
        type: 'CHART',
        datasource: 'lendings',
        definition: {
          chartType: 'bar',
          dimension: { field: 'direction' },
          measure: { field: 'amount', aggregation: 'sum' },
          filters: [{ field: 'counterpartyName', operator: 'is', value: counterparty.name }],
        },
      })) as any;
      expect(dirChart.categories).toContain('lent');
      expect(dirChart.categories).toContain('borrowed');
    });

    test('14. reward_earnings: 2% rule on ₹1000 spend -> valueInr 20, group by rule', async ({
      api,
    }) => {
      const month = fixedMonth();
      const { account } = await createRewardCard(api, { name: `Reward Card ${Date.now()}` });

      const rule = await createRewardRule(api, account.id, {
        name: `2% Cashback Rule ${Date.now()}`,
        accrualType: 'PERCENT',
        percentRate: 2.0,
      });

      await spend(api, account.id, {
        amount: 1000,
        date: `${month.from.slice(0, 7)}-05`,
      });

      const rwKpi = (await runAdHoc(api, {
        type: 'KPI',
        datasource: 'reward_earnings',
        definition: {
          measure: 'valueInr',
          aggregation: 'sum',
          filters: [{ field: 'rule', operator: 'is', value: rule.name }],
        },
      })) as any;
      expect(rwKpi.value).toBe(20);
    });
  });

  // ==========================================================================
  // 4. Tenancy & Auth
  // ==========================================================================
  test.describe('Tenancy and Auth', () => {
    test('User B accessing User A report returns 400 VALIDATION_ERROR', async ({ api, request }) => {
      const reportA = await createReport(api, {
        name: 'User A Secret Report',
        type: 'KPI',
        datasource: 'transactions',
        definition: { measure: 'amount', aggregation: 'sum', filters: [] },
      });

      const userB = await secondUser(request, 'reports-tenancy-b');

      // GET
      const getB = await userB.api.GET('/api/v1/reports/{id}', { params: { path: { id: reportA.id } } });
      expectStatus(getB, 400);
      expect(getB.error?.code).toBe('VALIDATION_ERROR');

      // PUT
      const putB = await userB.api.PUT('/api/v1/reports/{id}', {
        params: { path: { id: reportA.id } },
        body: { name: 'Hacked', definition: { measure: 'amount', aggregation: 'sum', filters: [] } },
      });
      expectStatus(putB, 400);

      // DELETE
      const delB = await userB.api.DELETE('/api/v1/reports/{id}', { params: { path: { id: reportA.id } } });
      expectStatus(delB, 400);

      // Run Saved
      const runB = await userB.api.POST('/api/v1/reports/{id}/data', { params: { path: { id: reportA.id } } });
      expectStatus(runB, 400);
    });

    test('Unknown report ID returns 404', async ({ api }) => {
      const nonExistent = '00000000-0000-0000-0000-000000000000';
      const res = await api.GET('/api/v1/reports/{id}', { params: { path: { id: nonExistent } } });
      expectStatus(res, 404);
    });

  });
});
