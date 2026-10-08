import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => {
  const Wrap = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Series = (kind: string) => {
    const Component = ({ dataKey, name }: { dataKey: string; name?: string }) => (
      <span data-testid={`${kind}-${dataKey}`} data-name={name ?? ''} />
    );
    Component.displayName = `Mock${kind}`;
    return Component;
  };
  return {
    ResponsiveContainer: Wrap, LineChart: Wrap, AreaChart: Wrap, BarChart: Wrap, PieChart: Wrap,
    Line: Series('line'), Area: Series('area'), Bar: Series('bar'),
    Pie: Wrap, Cell: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, Legend: () => null,
  };
});

import { ChartView } from '@/components/reports/views/ChartView';
import { KpiView } from '@/components/reports/views/KpiView';
import { ReportDataView } from '@/components/reports/views/ReportDataView';
import { TableView } from '@/components/reports/views/TableView';
import type { KpiData, TableData } from '@/lib/reports.types';

const tableData = (page: Partial<TableData['page']>): TableData => ({
  type: 'TABLE', mode: 'raw',
  columns: [{ key: 'title', label: 'Title', type: 'string' }],
  rows: [{ id: 1, title: 'Row A' }],
  page: { number: 0, size: 20, totalElements: 1, totalPages: 1, ...page },
});

describe('TableView footer in fill mode', () => {
  it('hides the footer for a single page that starts at 0', () => {
    const { container } = render(<TableView data={tableData({})} fill />);
    expect(screen.getByText('Row A')).toBeInTheDocument();
    expect(container.querySelector('.rounded-b-lg')).toBeNull();
    expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument();
  });

  it('hides the footer when totalElements equals the page size exactly', () => {
    const { container } = render(<TableView data={tableData({ totalElements: 20, size: 20 })} fill />);
    expect(container.querySelector('.rounded-b-lg')).toBeNull();
  });

  it('shows the footer when there is more than one page', () => {
    const { container } = render(<TableView data={tableData({ totalElements: 45, totalPages: 3 })} fill />);
    expect(container.querySelector('.rounded-b-lg')).not.toBeNull();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
  });

  it('shows the footer when viewing a later page even if it is the only remaining content', () => {
    const { container } = render(<TableView data={tableData({ number: 1, totalElements: 1, totalPages: 2 })} fill />);
    expect(container.querySelector('.rounded-b-lg')).not.toBeNull();
    expect(screen.getByLabelText('Previous page')).toBeEnabled();
  });

  it('keeps the footer in the default (non-fill) layout for a single page', () => {
    const fill = render(<TableView data={tableData({})} fill />).container.innerHTML;
    const flow = render(<TableView data={tableData({})} />).container.innerHTML;
    expect(flow.length).toBeGreaterThan(fill.length);
  });
});

describe('ChartView series label', () => {
  const data = (type: string) => ({ chartType: type, categories: ['Food'], series: [{ name: 'spend', data: [10] }] });
  it.each([
    ['bar', 'bar-spend'],
    ['line', 'line-spend'],
    ['area', 'area-spend'],
  ])('capitalizes the legend label for a %s series but keeps the data key', (type, id) => {
    render(<ChartView data={data(type)} />);
    expect(screen.getByTestId(id)).toHaveAttribute('data-name', 'Spend');
  });
  it('leaves already-capitalized and multi-word names alone beyond the first letter', () => {
    render(<ChartView data={{ chartType: 'bar', categories: ['a'], series: [{ name: 'net worth', data: [1] }] }} />);
    expect(screen.getByTestId('bar-net worth')).toHaveAttribute('data-name', 'Net worth');
  });
  it('shows the empty message with no categories', () => {
    render(<ChartView data={{ chartType: 'bar', categories: [], series: [] }} />);
    expect(screen.getByText('No data for this configuration.')).toBeInTheDocument();
  });
});

describe('KpiView widget variant', () => {
  const kpi = (over: Partial<KpiData> = {}): KpiData => ({
    type: 'KPI', value: 1234, measure: 'amount', aggregation: 'sum', format: 'number', comparison: null,
    meta: { rowCount: 1, dateRange: { from: '2026-09-01', to: '2026-09-30' } }, ...over,
  });
  const up = { previousValue: 800, previousDateRange: { from: '2026-08-01', to: '2026-08-31' }, change: 434, changePercent: 54, direction: 'up', sentiment: 'good' } as KpiData['comparison'];

  it('widget variant renders a large value; default renders the compact one', () => {
    const w = render(<KpiView data={kpi()} variant="widget" />);
    expect(w.container.querySelector('p')).toHaveClass('text-3xl');
    w.unmount();
    const d = render(<KpiView data={kpi()} />);
    expect(d.container.querySelector('p')).toHaveClass('text-lg');
    expect(d.container.querySelector('p')).not.toHaveClass('text-3xl');
  });

  it('widget variant shows the comparison as a pill, default as a plain line', () => {
    const w = render(<KpiView data={kpi({ comparison: up })} variant="widget" />);
    const pill = w.container.querySelector('[title]:not(p)')!;
    expect(pill).toHaveClass('rounded-full');
    expect(pill).toHaveClass('bg-emerald-50');
    w.unmount();
    const d = render(<KpiView data={kpi({ comparison: up })} />);
    const line = d.container.querySelector('[title]:not(p)')!;
    expect(line).not.toHaveClass('rounded-full');
    expect(line).toHaveClass('text-emerald-600');
  });

  it('colors the pill by sentiment', () => {
    const bad = { ...up!, direction: 'down', sentiment: 'bad' } as KpiData['comparison'];
    const { container } = render(<KpiView data={kpi({ comparison: bad })} variant="widget" />);
    expect(container.querySelector('.rounded-full')).toHaveClass('bg-rose-50');
  });

  it('shows an em dash for a null value and omits the secondary row with no range or comparison', () => {
    const { container } = render(<KpiView data={kpi({ value: null, meta: { rowCount: 0, dateRange: null as never } })} variant="widget" />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('ReportDataView uses the widget variant only in fill mode', () => {
    const noop = vi.fn();
    const fill = render(<ReportDataView data={kpi()} fill onPageChange={noop} onSizeChange={noop} />);
    expect(fill.container.querySelector('p')).toHaveClass('text-3xl');
    fill.unmount();
    const flow = render(<ReportDataView data={kpi()} onPageChange={noop} onSizeChange={noop} />);
    expect(flow.container.querySelector('p')).toHaveClass('text-lg');
  });
});
