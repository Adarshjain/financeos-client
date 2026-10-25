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

import { categoryRequest, hasUnderlying, tableRowRequest, wholeReportRequest } from './underlyingRequest';

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
