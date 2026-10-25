import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
const result = vi.hoisted(() => vi.fn());
vi.mock('@/features/reports/view/ReportResult', () => ({
  ReportResult: (props: Record<string, unknown>) => {
    result(props);
    return <div data-testid="result" />;
  },
}));

import { catalogFixture, savedChart } from '@/features/reports/builder/editor.fixtures';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { ChartData, PivotTableData, ReportResponse } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ReportWidgetBody } from './ReportWidgetBody';
import type { ReportWidgetState } from './useReportWidget';

const widget: WidgetResponse = { id: 'w1', kind: 'report', reportId: 'r1', title: null, layout: { x: 0, y: 0, w: 50, h: 24 }, report: { name: 'x', type: 'CHART', available: true } };
const state = (data: unknown): ReportWidgetState => ({ data, loading: false, sort: { key: 'spend_sum', direction: 'desc' }, setSort: vi.fn(), setPage: vi.fn(), setSize: vi.fn() }) as unknown as ReportWidgetState;
const serve = (report: ReportResponse) =>
  api.GET.mockImplementation(async (path: string) => (path === '/api/v1/reports/{id}' ? { data: report } : { data: catalogFixture }));

const chartData = {
  type: 'CHART',
  chartType: 'bar',
  dimension: 'category',
  categories: ['Food', 'Rent', 'Other'],
  series: [{ name: 'DEBIT', data: [1, 2, 3] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 3, dateRange: null },
  other: { index: 2, foldedCount: 4 },
} as unknown as ChartData;
const pivotData = {
  type: 'TABLE',
  mode: 'aggregated',
  rowDimensions: [{ field: 'category', label: 'Category' }],
  columnDimensions: [],
  measures: [{ key: 'spend_sum', field: 'spend', aggregation: 'sum', label: 'Spend' }],
  columns: [{ key: '', values: {} }],
  rows: [
    { key: 'food', values: { category: 'Food' }, cells: {} },
    { key: 'none', values: { category: '(none)' }, cells: {} },
  ],
  page: { number: 0, size: 50, totalElements: 2, totalPages: 1 },
} as unknown as PivotTableData;
const pivotReport = {
  ...savedChart,
  type: 'TABLE',
  definition: { mode: 'aggregated', rows: [{ field: 'category' }], columns: [], measures: [{ field: 'spend', aggregation: 'sum' }], filters: [] },
} as unknown as ReportResponse;

const props = async () => {
  await screen.findByTestId('result');
  return result.mock.calls.at(-1)![0];
};

beforeEach(() => {
  vi.clearAllMocks();
  serve(savedChart);
});

describe('ReportWidgetBody underlying openers', () => {
  it('opens the whole report on the category\'s entry for a chart entry press and a breakdown row', async () => {
    const open = vi.fn();
    renderWithQuery(<ReportWidgetBody widget={widget} state={state(chartData)} onOpenUnderlyingTarget={open} />);
    const p = await props();
    p.onOpenChartEntry(1);
    p.onOpenBreakdownRow(0);
    expect(open).toHaveBeenNthCalledWith(1, { request: expect.objectContaining({ type: 'KPI', definition: expect.objectContaining({ measure: 'spend' }) }), category: 1, pinned: expect.objectContaining({ type: 'KPI' }) });
    expect(open).toHaveBeenNthCalledWith(2, expect.objectContaining({ category: 0 }));
  });

  it('opens the request pinned to category and series for a multi-series entry', async () => {
    serve({ ...savedChart, definition: { ...savedChart.definition, series: { field: 'type' } } } as unknown as ReportResponse);
    const open = vi.fn();
    renderWithQuery(<ReportWidgetBody widget={widget} state={state(chartData)} onOpenUnderlyingTarget={open} />);
    (await props()).onOpenChartEntry(1, 'DEBIT');
    const target = open.mock.calls[0][0];
    expect(target.category).toBeUndefined();
    expect(target.request.definition.filters).toEqual(
      expect.arrayContaining([
        { field: 'category', operator: 'is', value: 'Rent' },
        { field: 'type', operator: 'is', value: 'DEBIT' },
      ]),
    );
  });

  it('opens nothing for Other and says its breakdown row cannot open', async () => {
    const open = vi.fn();
    renderWithQuery(<ReportWidgetBody widget={widget} state={state(chartData)} onOpenUnderlyingTarget={open} />);
    const p = await props();
    p.onOpenChartEntry(2);
    p.onOpenBreakdownRow(2);
    expect(open).not.toHaveBeenCalled();
    expect(p.canOpenBreakdownRow(2)).toBe(false);
    expect(p.canOpenChartEntry(2)).toBe(false);
    expect(p.canOpenChartEntry(0)).toBe(true);
    expect(p.canOpenBreakdownRow(0)).toBe(true);
  });

  it('opens an aggregated table row pinned to its group values, and gates the row it cannot pin', async () => {
    serve(pivotReport);
    const open = vi.fn();
    renderWithQuery(<ReportWidgetBody widget={widget} state={state(pivotData)} onOpenUnderlyingTarget={open} />);
    const p = await props();
    p.onOpenTableRow('food');
    expect(open).toHaveBeenCalledWith({ request: expect.objectContaining({ definition: expect.objectContaining({ filters: [{ field: 'category', operator: 'is', value: 'Food' }] }) }) });
    p.onOpenTableRow('none');
    expect(open).toHaveBeenCalledTimes(1);
    expect(p.canOpenTableRow('none')).toBe(false);
  });

  it('presses nothing without an opener (editing, or no underlying menu item)', async () => {
    renderWithQuery(<ReportWidgetBody widget={widget} state={state(chartData)} />);
    const p = await props();
    expect(p.onOpenChartEntry).toBeUndefined();
    expect(p.onOpenBreakdownRow).toBeUndefined();
    expect(p.onOpenTableRow).toBeUndefined();
  });
});
