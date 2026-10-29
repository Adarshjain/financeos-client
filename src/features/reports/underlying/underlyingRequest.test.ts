import { describe, expect, it } from 'vitest';

import { catalogFixture } from '@/features/reports/builder/editor.fixtures';
import type {
  ChartData,
  ChartDefinition,
  DatasourceCatalog,
  PivotTableData,
  RunReportRequest,
  TableDefinitionAggregated,
} from '@/lib/reports.types';

import { categoryEntries, categoryRequest, categoryTarget, hasUnderlying, resolveChartEntry, tableRowRequest, wholeReportRequest } from './underlyingRequest';

const ds = catalogFixture.datasources[0];
const catalog: DatasourceCatalog = { fields: ds.fields, operators: catalogFixture.operators };
const hide = { field: 'isExcluded', operator: 'is', value: false };

const chartDef = (over: Partial<ChartDefinition> = {}): ChartDefinition => ({
  chartType: 'bar',
  dimension: { field: 'category' },
  measure: { field: 'spend', aggregation: 'sum' },
  filters: [hide],
  ...over,
});
const chartReq = (def: ChartDefinition): RunReportRequest => ({ type: 'CHART', datasource: 'transactions', definition: def });
const chartData = (over: Partial<ChartData> = {}): ChartData => ({
  type: 'CHART',
  chartType: 'bar',
  dimension: 'category',
  categories: ['Food', 'Rent', '(none)', 'Other'],
  series: [{ name: 'spend', data: [1, 2, 3, 4] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 4, dateRange: null },
  ...over,
});

describe('wholeReportRequest', () => {
  it('passes a KPI through as it is', () => {
    const request: RunReportRequest = {
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [hide], comparison: { enabled: false } },
    };
    expect(wholeReportRequest(request)).toEqual(request);
  });

  it('turns a chart into a KPI of its measure and filters', () => {
    expect(wholeReportRequest(chartReq(chartDef()))).toEqual({
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [hide] },
    });
  });

  it('turns an aggregated table into a KPI of its first measure', () => {
    const def: TableDefinitionAggregated = {
      mode: 'aggregated',
      rows: [{ field: 'category' }],
      columns: [],
      measures: [
        { field: 'spend', aggregation: 'sum' },
        { field: 'amount', aggregation: 'count' },
      ],
      filters: [hide],
    };
    expect(wholeReportRequest({ type: 'TABLE', datasource: 'transactions', definition: def })).toMatchObject({
      type: 'KPI',
      definition: { measure: 'spend', aggregation: 'sum', filters: [hide] },
    });
  });

  it('has none for a raw table', () => {
    const request: RunReportRequest = {
      type: 'TABLE',
      datasource: 'transactions',
      definition: { mode: 'raw', columns: ['date'], filters: [] },
    };
    expect(hasUnderlying(request)).toBe(false);
    expect(wholeReportRequest(request)).toBeNull();
  });
});

describe('categoryRequest', () => {
  it('pins a category of a non-date dimension with an "is" clause after the report filters', () => {
    const request = categoryRequest(chartReq(chartDef()), chartData(), 1, catalog);
    expect(request).toEqual({
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [hide, { field: 'category', operator: 'is', value: 'Rent' }] },
    });
  });

  it('pins a string dimension with "exact"', () => {
    const request = categoryRequest(
      chartReq(chartDef({ dimension: { field: 'description' } })),
      chartData({ categories: ['Swiggy'] }),
      0,
      catalog,
    );
    expect((request?.definition as { filters: unknown[] }).filters.at(-1)).toEqual({ field: 'description', operator: 'exact', value: 'Swiggy' });
  });

  it('pins a date dimension with the window the category covers and turns the comparison off', () => {
    const request = categoryRequest(
      chartReq(chartDef({ dimension: { field: 'date', granularity: 'month' } })),
      chartData({ categories: ['Sep 2026', 'Oct 2026'], categoryRanges: [{ from: '2026-09-01', to: '2026-09-30' }, { from: '2026-10-01', to: '2026-10-31' }] }),
      1,
      catalog,
    );
    expect(request?.definition).toEqual({
      measure: 'spend',
      aggregation: 'sum',
      filters: [hide, { field: 'date', operator: 'between', value: { from: '2026-10-01', to: '2026-10-31' } }],
      comparison: { enabled: false },
    });
  });

  it('has none for a date category with no known window', () => {
    const request = chartReq(chartDef({ dimension: { field: 'date', granularity: 'month' } }));
    expect(categoryRequest(request, chartData({ categoryRanges: [null, null, null, null] }), 0, catalog)).toBeNull();
    expect(categoryRequest(request, chartData({ categoryRanges: null }), 0, catalog)).toBeNull();
  });

  it('has none for the Other slot', () => {
    expect(categoryRequest(chartReq(chartDef()), chartData({ other: { index: 3, foldedCount: 4 } }), 3, catalog)).toBeNull();
  });

  it('has none for a (none) category', () => {
    expect(categoryRequest(chartReq(chartDef()), chartData(), 2, catalog)).toBeNull();
  });

  it('also pins the series value when the chart has a series', () => {
    const request = categoryRequest(chartReq(chartDef({ series: { field: 'type' } })), chartData(), 0, catalog, 'DEBIT');
    expect((request?.definition as { filters: unknown[] }).filters).toEqual([
      hide,
      { field: 'category', operator: 'is', value: 'Food' },
      { field: 'type', operator: 'is', value: 'DEBIT' },
    ]);
  });

  it('pins no series when none is asked for or the chart has none', () => {
    const withSeries = categoryRequest(chartReq(chartDef({ series: { field: 'type' } })), chartData(), 0, catalog);
    const without = categoryRequest(chartReq(chartDef()), chartData(), 0, catalog, 'DEBIT');
    expect((withSeries?.definition as { filters: unknown[] }).filters).toHaveLength(2);
    expect((without?.definition as { filters: unknown[] }).filters).toHaveLength(2);
  });

  it('has none for a date series', () => {
    const request = chartReq(chartDef({ series: { field: 'date', granularity: 'month' } }));
    expect(categoryRequest(request, chartData(), 0, catalog, 'Oct 2026')).toBeNull();
  });
});

describe('categoryRequest with the report own filters', () => {
  const dateDim = chartDef({ dimension: { field: 'date', granularity: 'month' } });
  const data = chartData({ categories: ['Oct 2026'], categoryRanges: [{ from: '2026-10-01', to: '2026-10-31' }] });
  const pin = { field: 'date', operator: 'between', value: { from: '2026-10-01', to: '2026-10-31' } };
  const filtersOf = (r: RunReportRequest | null) => (r?.definition as { filters: unknown[] }).filters;

  it('replaces this_month and last_x_days filters on the same date field with the pin', () => {
    const def = { ...dateDim, filters: [{ field: 'date', operator: 'this_month' }, hide, { field: 'date', operator: 'last_x_days', value: { amount: 90 } }] };
    expect(filtersOf(categoryRequest(chartReq(def), data, 0, catalog))).toEqual([hide, pin]);
  });

  it('keeps date filters on other fields', () => {
    const other = { field: 'payDate', operator: 'this_month' };
    const def = { ...dateDim, filters: [other, { field: 'date', operator: 'this_month' }] };
    expect(filtersOf(categoryRequest(chartReq(def), data, 0, catalog))).toEqual([other, pin]);
  });

  it('keeps the report date filter when a non-date category is pinned', () => {
    const date = { field: 'date', operator: 'this_month' };
    const out = categoryRequest(chartReq(chartDef({ filters: [date] })), chartData(), 0, catalog);
    expect(filtersOf(out)).toEqual([date, { field: 'category', operator: 'is', value: 'Food' }]);
  });

  it('pins a number dimension with "equals" and a numeric value', () => {
    const numCatalog: DatasourceCatalog = { ...catalog, fields: [...catalog.fields, { name: 'tier', label: 'Tier', type: 'number', role: 'dimension', allowedInReports: ['CHART'] }] };
    const out = categoryRequest(chartReq(chartDef({ dimension: { field: 'tier' } })), chartData({ categories: ['3'] }), 0, numCatalog);
    expect(filtersOf(out).at(-1)).toEqual({ field: 'tier', operator: 'equals', value: 3 });
  });

  it('pins the stored value, not the label, of an enum with value labels', () => {
    const out = categoryRequest(
      chartReq(chartDef({ dimension: { field: 'type' } })),
      chartData({ categories: ['DEBIT'], valueLabels: { DEBIT: 'Money out' } }),
      0,
      catalog,
    );
    expect(filtersOf(out).at(-1)).toEqual({ field: 'type', operator: 'is', value: 'DEBIT' });
  });
});

describe('categoryEntries', () => {
  it('lists each category with its own request, leaving out Other and a category that cannot be pinned', () => {
    const request = chartReq(chartDef());
    const data = chartData({ other: { index: 3, foldedCount: 4 } });
    const entries = categoryEntries(request, data, catalog);
    expect(entries.map((e) => e.label)).toEqual(['Food', 'Rent']);
    expect(entries[0].request).toEqual(categoryRequest(request, data, 0, catalog));
    expect(entries[1].request).toEqual(categoryRequest(request, data, 1, catalog));
  });

  it('reads a static enum category by its label', () => {
    const request = chartReq(chartDef({ dimension: { field: 'type' } }));
    const entries = categoryEntries(request, chartData({ categories: ['DEBIT'], valueLabels: { DEBIT: 'Money out' } }), catalog);
    expect(entries.map((e) => e.label)).toEqual(['Money out']);
  });

  it('is empty when no category can be pinned', () => {
    expect(categoryEntries(chartReq(chartDef()), chartData({ categories: ['(none)'] }), catalog)).toEqual([]);
  });
});

describe('tableRowRequest', () => {
  const def = (rows: string[]): TableDefinitionAggregated => ({
    mode: 'aggregated',
    rows: rows.map((field) => ({ field })),
    columns: [],
    measures: [{ field: 'spend', aggregation: 'sum' }],
    filters: [hide],
  });
  const req = (rows: string[]): RunReportRequest => ({ type: 'TABLE', datasource: 'transactions', definition: def(rows) });
  const data = (dims: string[], rows: PivotTableData['rows']): PivotTableData => ({
    type: 'TABLE',
    mode: 'aggregated',
    rowDimensions: dims.map((field) => ({ field, label: field })),
    columnDimensions: [],
    measures: [{ key: 'spend_sum', field: 'spend', aggregation: 'sum', label: 'Spend' }],
    columns: [{ key: '', values: {} }],
    rows,
    page: { number: 0, size: 25, totalElements: rows.length, totalPages: 1 },
  });

  it('pins every group-by value of the row', () => {
    const rows = [{ key: 'a', values: { category: 'Food', type: 'DEBIT' }, cells: {} }];
    const request = tableRowRequest(req(['category', 'type']), data(['category', 'type'], rows), 'a', catalog);
    expect(request?.definition).toEqual({
      measure: 'spend',
      aggregation: 'sum',
      filters: [hide, { field: 'category', operator: 'is', value: 'Food' }, { field: 'type', operator: 'is', value: 'DEBIT' }],
    });
  });

  it('has none for a row with a date or missing group value, or an unknown row', () => {
    const rows: PivotTableData['rows'] = [
      { key: 'd', values: { date: 'Oct 2026' }, cells: {} },
      { key: 'n', values: { category: '(none)' }, cells: {} },
    ];
    expect(tableRowRequest(req(['date']), data(['date'], rows), 'd', catalog)).toBeNull();
    expect(tableRowRequest(req(['category']), data(['category'], rows), 'n', catalog)).toBeNull();
    expect(tableRowRequest(req(['category']), data(['category'], rows), 'zzz', catalog)).toBeNull();
  });
});

describe('resolveChartEntry', () => {
  const multi = chartData({
    categories: ['Food', 'Rent'],
    series: [
      { name: 'DEBIT', data: [1, 2] },
      { name: 'CREDIT', data: [3, 4] },
    ],
    seriesValueLabels: { DEBIT: 'Debit', CREDIT: 'Credit' },
  });
  const press = (key: string, seriesKey?: string, label = key) => ({ key, label, seriesKey });

  it('names the category index and, on a chart with a series, the stored series name behind its label', () => {
    const def = chartDef({ series: { field: 'type' } });
    expect(resolveChartEntry(multi, def, press('Rent', 'Credit'))).toEqual({ index: 1, seriesName: 'CREDIT' });
  });

  it('names the category only when the chart has no series', () => {
    expect(resolveChartEntry(chartData(), chartDef(), press('Rent', 'Spend'))).toEqual({ index: 1 });
  });

  it('names the category only for a pie or donut', () => {
    expect(resolveChartEntry(chartData(), chartDef({ chartType: 'pie', series: { field: 'type' } }), press('Rent', 'Spend'))).toEqual({ index: 1 });
  });

  it('reads an enum category by its label', () => {
    const labelled = chartData({ categories: ['DEBIT'], series: [{ name: 'spend', data: [1] }], valueLabels: { DEBIT: 'Debit' } });
    expect(resolveChartEntry(labelled, chartDef(), press('Debit', 'Spend'))).toEqual({ index: 0 });
  });

  it('has none for a pie\'s folded Other slice, a folded Other series or an unknown entry', () => {
    const def = chartDef({ series: { field: 'type' } });
    expect(resolveChartEntry(chartData(), chartDef({ chartType: 'pie' }), press('Other', 'Spend', 'Other (3)'))).toBeNull();
    expect(resolveChartEntry(multi, def, press('Rent', 'Other'))).toBeNull();
    expect(resolveChartEntry(multi, def, press('Gone', 'Debit'))).toBeNull();
  });
});

describe('categoryTarget', () => {
  it('opens the whole report on the category\'s dropdown entry', () => {
    const target = categoryTarget(chartReq(chartDef()), chartData(), 1, catalog);
    expect(target).toEqual({
      request: wholeReportRequest(chartReq(chartDef())),
      category: 1,
      pinned: categoryRequest(chartReq(chartDef()), chartData(), 1, catalog),
    });
  });

  it('makes a series pin final: the pinned request and no dropdown entry', () => {
    const def = chartDef({ series: { field: 'type' } });
    const target = categoryTarget(chartReq(def), chartData(), 0, catalog, 'DEBIT');
    expect(target?.category).toBeUndefined();
    expect(target?.request).toEqual(categoryRequest(chartReq(def), chartData(), 0, catalog, 'DEBIT'));
  });

  it('has none for the Other slot, a (none) category or an unpinnable series', () => {
    expect(categoryTarget(chartReq(chartDef()), chartData({ other: { index: 3, foldedCount: 2 } }), 3, catalog)).toBeNull();
    expect(categoryTarget(chartReq(chartDef()), chartData(), 2, catalog)).toBeNull();
    expect(categoryTarget(chartReq(chartDef({ series: { field: 'type' } })), chartData(), 0, catalog, '(none)')).toBeNull();
  });
});

describe('resolveChartEntry for a heatmap and for repeated labels', () => {
  const heat = chartData({
    chartType: 'heatmap',
    dimension: 'date',
    categories: ['08 Oct 26', '09 Oct 26', '09 Oct 26'],
    categoryRanges: [
      { from: '2026-10-08', to: '2026-10-08' },
      { from: '2026-10-09', to: '2026-10-09' },
      { from: '2026-10-09', to: '2026-10-09' },
    ],
    series: [{ name: 'Spend', data: [1, 2, 3] }],
  });
  const heatDef = chartDef({ dimension: { field: 'date', granularity: 'day' } });

  it('finds a heatmap day by its ISO date among "dd Mon yy" categories, without a series', () => {
    const pick = resolveChartEntry(heat, heatDef, { key: '2026-10-09', label: '09/10/26', value: 5 });
    expect(pick).toEqual({ index: 1 });
    expect(resolveChartEntry(heat, heatDef, { key: '2026-10-01', label: '01/10/26', value: 5 })).toBeNull();
  });

  it('pins only the day\'s date window for a heatmap day, replacing the report\'s date filters', () => {
    const request = chartReq(heatDef);
    const target = categoryTarget(request, heat, 1, catalog);
    const filters = (target?.pinned?.definition as { filters: unknown[] }).filters;
    expect(filters).toEqual([hide, { field: 'date', operator: 'between', value: { from: '2026-10-09', to: '2026-10-09' } }]);
  });

  it('uses the entry\'s index over the label when labels repeat', () => {
    const dup = chartData({ categories: ['Food', 'Food'], series: [{ name: 'spend', data: [1, 2] }] });
    expect(resolveChartEntry(dup, chartDef(), { key: 'Food', label: 'Food', seriesKey: 'Spend', index: 1, value: 2 })).toEqual({ index: 1 });
    expect(resolveChartEntry(dup, chartDef(), { key: 'Food', label: 'Food', seriesKey: 'Spend', value: 2 })).toEqual({ index: 0 });
  });

  it('ignores an index that does not match the entry\'s key', () => {
    expect(resolveChartEntry(chartData(), chartDef(), { key: 'Rent', label: 'Rent', index: 0, value: 2 })).toEqual({ index: 1 });
  });
});
