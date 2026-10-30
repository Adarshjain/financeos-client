import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds/Conceal/Conceal';
import { catalogFixture } from '@/features/reports/builder/editor.fixtures';
import { workingCatalog } from '@/features/reports/builder/editorStateModel';
import type { ChartData, KpiData, PivotTableData, TableData } from '@/lib/reports.types';

import { ReportResult } from './ReportResult';

vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: ({
    data,
    money,
    columns,
    bars,
    higherIsBetter,
    rowsLabel,
    onOpenRow,
    canOpenRow,
  }: {
    data: { chartType: string };
    money?: boolean;
    columns?: string[];
    bars?: string;
    higherIsBetter?: boolean;
    rowsLabel?: string;
    onOpenRow?: (index: number) => void;
    canOpenRow?: (index: number) => boolean;
  }) => (
    <div
      data-testid="chart"
      data-type={data.chartType}
      data-money={String(money)}
      data-columns={columns?.join(',')}
      data-bars={bars}
      data-higher={String(higherIsBetter)}
      data-rows-label={rowsLabel}
      data-can-open-1={String(canOpenRow?.(1))}
    >
      <button onClick={() => onOpenRow?.(1)}>open row 1</button>
    </div>
  ),
}));

const catalog = workingCatalog(catalogFixture, 'transactions');
const user = userEvent.setup({ pointerEventsCheck: 0 });

const kpi = (over: Partial<KpiData> = {}): KpiData => ({
  type: 'KPI',
  value: 184320,
  measure: 'spend',
  aggregation: 'sum',
  format: 'currency',
  comparison: {
    previousValue: 170000,
    previousDateRange: { from: '2026-07-01', to: '2026-09-30' },
    change: 14320,
    changePercent: 8.4,
    direction: 'up',
    sentiment: 'bad',
  },
  meta: { rowCount: 182, dateRange: { from: '2026-10-01', to: '2026-10-25' } },
  ...over,
});

describe('KPI result', () => {
  it('shows the figure as whole rupees under its plain field label, with no aggregation', () => {
    render(<ReportResult data={kpi()} catalog={catalog} />);
    expect(screen.getByText('Spend')).toBeInTheDocument();
    expect(screen.queryByText(/sum|count/i)).toBeNull();
    expect(screen.getByText('₹1,84,320')).toBeInTheDocument();
  });

  it('leaves the measure overline out for a widget (hideMeasure) and keeps it otherwise', () => {
    const { rerender } = render(<ReportResult data={kpi()} catalog={catalog} hideMeasure />);
    expect(screen.queryByText('Spend')).toBeNull();
    expect(screen.getByText('₹1,84,320')).toBeInTheDocument();
    rerender(<ReportResult data={kpi()} catalog={catalog} />);
    expect(screen.getByText('Spend')).toBeInTheDocument();
  });

  it('the figure is a button that calls onOpenKpi when given one, and plain text otherwise', async () => {
    const onOpenKpi = vi.fn();
    const { rerender } = render(<ReportResult data={kpi()} catalog={catalog} onOpenKpi={onOpenKpi} />);
    await userEvent.click(screen.getByRole('button', { name: '₹1,84,320' }));
    expect(onOpenKpi).toHaveBeenCalledTimes(1);
    rerender(<ReportResult data={kpi()} catalog={catalog} />);
    expect(screen.queryByRole('button', { name: '₹1,84,320' })).toBeNull();
  });

  it('hides the pressable figure\'s amount while amounts are hidden', () => {
    render(
      <ConcealProvider concealed>
        <ReportResult data={kpi()} catalog={catalog} onOpenKpi={vi.fn()} />
      </ConcealProvider>,
    );
    expect(screen.getByRole('button', { name: '₹ —' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('1,84,320');
  });

  it('draws the tile as a card, or plain with no card when asked (inside a widget)', () => {
    const { container, rerender } = render(<ReportResult data={kpi()} catalog={catalog} />);
    expect(container.querySelector('[class*="px-space-16"]')).not.toBeNull();
    rerender(<ReportResult data={kpi()} catalog={catalog} kpiVariant="plain" />);
    expect(container.querySelector('[class*="px-space-16"]')).toBeNull();
    expect(screen.getByText('₹1,84,320')).toBeInTheDocument();
  });

  it('shows the change with its sign and percent', () => {
    render(<ReportResult data={kpi()} catalog={catalog} />);
    expect(screen.getByText('+₹14,320 (+8.4%)')).toBeInTheDocument();
  });

  it('shows the previous period’s value when the report asks for it', () => {
    render(<ReportResult data={kpi({ comparison: { ...kpi().comparison!, display: 'previous_value' } })} catalog={catalog} />);
    expect(screen.getByText('prev ₹1,70,000')).toBeInTheDocument();
    expect(screen.queryByText(/\+₹14,320/)).not.toBeInTheDocument();
  });

  it('shows no comparison line when the report has none, and a dash for no value', () => {
    render(<ReportResult data={kpi({ comparison: null, value: null })} catalog={catalog} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/vs /)).not.toBeInTheDocument();
  });

  it('prints a count as an integer, not rupees', () => {
    render(<ReportResult data={kpi({ aggregation: 'count', value: 182, comparison: null })} catalog={catalog} />);
    expect(screen.getByText('182')).toBeInTheDocument();
  });
});

const chart = (over: Partial<ChartData> = {}): ChartData => ({
  type: 'CHART',
  chartType: 'bar',
  dimension: 'category',
  categories: ['Food & dining', 'Shopping'],
  series: [{ name: 'Spend', data: [42180, 38650] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 2, dateRange: null },
  ...over,
});

describe('chart result', () => {
  it('draws a chart through the Chart organism', async () => {
    render(<ReportResult data={chart()} catalog={catalog} />);
    expect(await screen.findByTestId('chart')).toHaveAttribute('data-type', 'bar');
  });

  it('tells the chart whether the measure is money from the catalog, and leaves it open without one', () => {
    const { unmount } = render(<ReportResult data={chart()} catalog={catalog} />);
    expect(screen.getByTestId('chart')).toHaveAttribute('data-money', 'true');
    unmount();
    render(<ReportResult data={chart({ measure: { field: 'description', aggregation: 'count' } })} catalog={catalog} />);
    expect(screen.getByTestId('chart')).toHaveAttribute('data-money', 'false');
  });

  it('hands a breakdown to the Chart with its definition and the row callbacks, and reports a pressed row by its index', async () => {
    const onOpen = vi.fn();
    const definition = { columns: ['amount', 'count'], bars: 'share_of_total', comparison: { enabled: true, higherIsBetter: false } };
    render(
      <ReportResult
        data={chart({ chartType: 'breakdown' })}
        catalog={catalog}
        definition={definition as never}
        onOpenBreakdownRow={onOpen}
        canOpenBreakdownRow={(i) => i === 1}
      />,
    );
    const el = screen.getByTestId('chart');
    expect(el).toHaveAttribute('data-type', 'breakdown');
    expect(el).toHaveAttribute('data-columns', 'amount,count');
    expect(el).toHaveAttribute('data-bars', 'share_of_total');
    expect(el).toHaveAttribute('data-higher', 'false');
    expect(el).toHaveAttribute('data-rows-label', 'Category');
    expect(el).toHaveAttribute('data-can-open-1', 'true');
    await user.click(screen.getByRole('button', { name: 'open row 1' }));
    expect(onOpen).toHaveBeenCalledWith(1);
  });
});

const raw = (): TableData => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'description', label: 'Description', type: 'string' },
    { key: 'amount', label: 'Amount', type: 'number', format: 'currency' },
  ],
  rows: [
    { id: 't1', description: 'Swiggy', amount: 420 },
    { id: 't2', description: 'Zomato', amount: 1250 },
  ],
  page: { number: 1, size: 25, totalElements: 60, totalPages: 3 },
});

describe('raw table result', () => {
  it('shows rows with formatted cells and the pager above and below', () => {
    render(<ReportResult data={raw()} catalog={catalog} onPageChange={vi.fn()} />);
    expect(screen.getAllByText('Swiggy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹1,250').length).toBeGreaterThan(0);
    const [above, below] = screen.getAllByRole('navigation', { name: 'Pagination' });
    expect(above.compareDocumentPosition(screen.getAllByText('Swiggy')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(below.compareDocumentPosition(screen.getAllByText('Swiggy')[0]) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('asks for another page from the pager', async () => {
    const onPageChange = vi.fn();
    render(<ReportResult data={raw()} catalog={catalog} onPageChange={onPageChange} />);
    const [above] = screen.getAllByRole('navigation', { name: 'Pagination' });
    await user.click(within(above).getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('sorts from a header: ascending first, then descending', async () => {
    const onSortChange = vi.fn();
    const { rerender } = render(<ReportResult data={raw()} catalog={catalog} onSortChange={onSortChange} sort={null} />);
    await user.click(within(screen.getByRole('columnheader', { name: /Amount/ })).getByRole('button'));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'amount', direction: 'asc' });
    rerender(<ReportResult data={raw()} catalog={catalog} onSortChange={onSortChange} sort={{ key: 'amount', direction: 'asc' }} />);
    await user.click(within(screen.getByRole('columnheader', { name: /Amount/ })).getByRole('button'));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'amount', direction: 'desc' });
  });
});

const pivot = (withColumns: boolean): PivotTableData => ({
  type: 'TABLE',
  mode: 'aggregated',
  rowDimensions: [{ field: 'category', label: 'Category' }],
  columnDimensions: withColumns ? [{ field: 'type', label: 'Type' }] : [],
  measures: [{ key: 'spend_sum', field: 'spend', aggregation: 'sum', label: 'Sum of Spend', format: 'currency' }],
  columns: withColumns
    ? [
        { key: 'DEBIT', values: { type: 'DEBIT' } },
        { key: 'CREDIT', values: { type: 'CREDIT' } },
      ]
    : [{ key: '', values: {} }],
  rows: [
    {
      key: 'food',
      values: { category: 'Food & dining' },
      cells: withColumns ? { DEBIT: { spend_sum: 42180 }, CREDIT: { spend_sum: 1200 } } : { '': { spend_sum: 42180 } },
    },
  ],
  page: { number: 0, size: 50, totalElements: 1, totalPages: 1 },
});

describe('aggregated table result', () => {
  it('shows group-by values and measure cells', () => {
    render(<ReportResult data={pivot(false)} catalog={catalog} />);
    expect(screen.getAllByText('Food & dining').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹42,180').length).toBeGreaterThan(0);
  });

  it('sorts by a measure when there are no pivot columns', async () => {
    const onSortChange = vi.fn();
    render(<ReportResult data={pivot(false)} catalog={catalog} onSortChange={onSortChange} sort={null} />);
    await user.click(within(screen.getByRole('columnheader', { name: /Spend/ })).getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'spend_sum', direction: 'asc' });
  });

  it('names a measure column by its plain field, never "(Sum)" or "Sum of"', () => {
    const data = pivot(false);
    data.measures = [{ ...data.measures[0], label: 'Spend (Sum)' }];
    render(<ReportResult data={data} catalog={catalog} />);
    expect(screen.getByRole('columnheader', { name: 'Spend' })).toBeInTheDocument();
    expect(screen.queryByText(/sum/i)).toBeNull();
  });

  it('keeps the server label only when the same field is aggregated twice', () => {
    const data = pivot(false);
    data.measures = [
      { key: 'spend_sum', field: 'spend', aggregation: 'sum', label: 'Spend (Sum)', format: 'currency' },
      { key: 'spend_avg', field: 'spend', aggregation: 'avg', label: 'Spend (Average)', format: 'currency' },
    ];
    render(<ReportResult data={data} catalog={catalog} />);
    expect(screen.getByRole('columnheader', { name: 'Spend (Sum)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Spend (Average)' })).toBeInTheDocument();
  });

  it('shows one column per pivot value and sorts only by the group-by when pivoted', async () => {
    const onSortChange = vi.fn();
    render(<ReportResult data={pivot(true)} catalog={catalog} onSortChange={onSortChange} sort={null} />);
    expect(screen.getByRole('columnheader', { name: /DEBIT/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /CREDIT/ })).toBeInTheDocument();
    expect(within(screen.getByRole('columnheader', { name: /DEBIT/ })).queryByRole('button')).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('columnheader', { name: /Category/ })).getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'category', direction: 'asc' });
  });
});
