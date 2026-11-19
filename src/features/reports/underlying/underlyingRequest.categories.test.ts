import { describe, expect, it } from 'vitest';

import { catalogFixture } from '@/features/reports/builder/editor.fixtures';
import type { ChartData, ChartDefinition, DatasourceCatalog, RunReportRequest } from '@/lib/reports.types';

import { categoryEntries, categoryRequest } from './underlyingRequest';

const ds = catalogFixture.datasources[0];
const catalog: DatasourceCatalog = { fields: ds.fields, operators: catalogFixture.operators };
const counts = { field: 'countsInTotals', operator: 'is', value: true };

const request = (dimension: string): RunReportRequest => {
  const definition: ChartDefinition = {
    chartType: 'bar',
    dimension: { field: dimension },
    measure: { field: 'spend', aggregation: 'sum' },
    filters: [counts],
  };
  return { type: 'CHART', datasource: 'transactions', definition };
};

const data = (dimension: string, categories: string[]): ChartData => ({
  type: 'CHART',
  chartType: 'bar',
  dimension,
  categories,
  series: [{ name: 'spend', data: categories.map(() => 1) }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: categories.length, dateRange: null },
});

const filtersOf = (r: RunReportRequest | null) => (r?.definition as { filters: unknown[] }).filters;

describe('category and sub-category pins', () => {
  const subs = data('subcategory', ['Food · Delivery', 'Food · Others', 'Uncategorized']);

  it('pins a sub-category row with its full label', () => {
    expect(filtersOf(categoryRequest(request('subcategory'), subs, 0, catalog))).toEqual([
      counts,
      { field: 'subcategory', operator: 'is', value: 'Food · Delivery' },
    ]);
  });

  it('pins the "Cat · Others" row with its full label, not the (none) bucket', () => {
    expect(filtersOf(categoryRequest(request('subcategory'), subs, 1, catalog))).toEqual([
      counts,
      { field: 'subcategory', operator: 'is', value: 'Food · Others' },
    ]);
  });

  it('pins the Uncategorized row of a sub-category report with its raw label', () => {
    expect(filtersOf(categoryRequest(request('subcategory'), subs, 2, catalog))).toEqual([
      counts,
      { field: 'subcategory', operator: 'is', value: 'Uncategorized' },
    ]);
  });

  it('pins the Uncategorized row of a category report with its raw label', () => {
    const cats = data('category', ['Food', 'Uncategorized']);
    expect(filtersOf(categoryRequest(request('category'), cats, 1, catalog))).toEqual([
      counts,
      { field: 'category', operator: 'is', value: 'Uncategorized' },
    ]);
  });

  it('lists every one of those rows as a dropdown entry', () => {
    expect(categoryEntries(request('subcategory'), subs, catalog).map((e) => e.label)).toEqual(['Food · Delivery', 'Food · Others', 'Uncategorized']);
  });
});
