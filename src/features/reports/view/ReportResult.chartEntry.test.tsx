import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const chart = vi.hoisted(() => vi.fn());
vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: (props: Record<string, unknown>) => {
    chart(props);
    return <div data-testid="chart" />;
  },
}));

import type { ChartData, ChartDefinition } from '@/lib/reports.types';

import { ReportResult } from './ReportResult';

const definition: ChartDefinition = {
  chartType: 'bar',
  dimension: { field: 'category' },
  series: { field: 'type' },
  measure: { field: 'spend', aggregation: 'sum' },
  filters: [],
};
const data = {
  type: 'CHART',
  chartType: 'bar',
  dimension: 'category',
  categories: ['Food', 'Rent'],
  series: [
    { name: 'DEBIT', data: [1, 2] },
    { name: 'CREDIT', data: [3, 4] },
  ],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 2, dateRange: null },
} as unknown as ChartData;

const press = (entry: { key: string; label: string; seriesKey?: string; value: number }) =>
  (chart.mock.calls.at(-1)![0].onSelectEntry as (e: typeof entry) => void)(entry);

beforeEach(() => chart.mockClear());

describe('a chart entry press', () => {
  it('reports the category index and the series name', () => {
    const open = vi.fn();
    render(<ReportResult data={data} definition={definition} onOpenChartEntry={open} />);
    press({ key: 'Rent', label: 'Rent', seriesKey: 'CREDIT', value: 4 });
    expect(open).toHaveBeenCalledWith(1, 'CREDIT');
  });

  it('presses nothing for an Other slice or a series that is not found', () => {
    const open = vi.fn();
    render(<ReportResult data={data} definition={definition} onOpenChartEntry={open} />);
    press({ key: 'Other', label: 'Other (3)', seriesKey: 'DEBIT', value: 4 });
    press({ key: 'Rent', label: 'Rent', seriesKey: 'Other', value: 4 });
    expect(open).not.toHaveBeenCalled();
  });

  it('leaves the chart unpressable without an opener or without the definition', () => {
    render(<ReportResult data={data} definition={definition} />);
    expect(chart.mock.calls.at(-1)![0].onSelectEntry).toBeUndefined();
    render(<ReportResult data={data} onOpenChartEntry={vi.fn()} />);
    expect(chart.mock.calls.at(-1)![0].onSelectEntry).toBeUndefined();
  });

  it('gates the chart: only an entry that resolves and that the page can open is selectable', () => {
    const gate = vi.fn((index: number) => index === 0);
    render(<ReportResult data={data} definition={definition} onOpenChartEntry={vi.fn()} canOpenChartEntry={gate} />);
    const can = chart.mock.calls.at(-1)![0].canSelectEntry as (e: { key: string; label: string; seriesKey?: string; value: number }) => boolean;
    expect(can({ key: 'Food', label: 'Food', seriesKey: 'DEBIT', value: 1 })).toBe(true);
    expect(can({ key: 'Rent', label: 'Rent', seriesKey: 'DEBIT', value: 2 })).toBe(false);
    expect(can({ key: 'Other', label: 'Other (3)', seriesKey: 'DEBIT', value: 2 })).toBe(false);
    expect(can({ key: 'Food', label: 'Food', seriesKey: 'Other', value: 2 })).toBe(false);
  });

  it('without a page gate, an entry is selectable when it resolves', () => {
    render(<ReportResult data={data} definition={definition} onOpenChartEntry={vi.fn()} />);
    const can = chart.mock.calls.at(-1)![0].canSelectEntry as (e: { key: string; label: string; seriesKey?: string; value: number }) => boolean;
    expect(can({ key: 'Rent', label: 'Rent', seriesKey: 'CREDIT', value: 4 })).toBe(true);
    expect(can({ key: 'Gone', label: 'Gone', seriesKey: 'CREDIT', value: 4 })).toBe(false);
  });

  it('opens a heatmap day by its date among "dd Mon yy" categories', () => {
    const heat = { ...data, chartType: 'heatmap', dimension: 'date', categories: ['08 Oct 26', '09 Oct 26'], series: [{ name: 'Spend', data: [1, 2] }] } as unknown as ChartData;
    const open = vi.fn();
    render(<ReportResult data={heat} definition={{ ...definition, series: undefined, dimension: { field: 'date', granularity: 'day' } }} onOpenChartEntry={open} />);
    press({ key: '2026-10-09', label: '09/10/26', value: 2 });
    expect(open).toHaveBeenCalledWith(1, undefined);
  });

  it('opens the entry at the reported index when labels repeat', () => {
    const dup = { ...data, categories: ['Food', 'Food'] } as unknown as ChartData;
    const open = vi.fn();
    render(<ReportResult data={dup} definition={definition} onOpenChartEntry={open} />);
    press({ key: 'Food', label: 'Food', seriesKey: 'DEBIT', value: 2, index: 1 } as never);
    expect(open).toHaveBeenCalledWith(1, 'DEBIT');
  });
});
