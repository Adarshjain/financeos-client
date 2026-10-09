import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Recharts is mocked down to inspectable stand-ins: series marks expose their
// key/label/colour/shape, the Y axis exposes its ticks, pie cells their fill.
vi.mock('recharts', () => {
  const Wrap = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  );
  const Series = (kind: string) => {
    const Component = (p: {
      dataKey: string;
      name?: string;
      fill?: string;
      stroke?: string;
      radius?: unknown;
      stackId?: string;
    }) => (
      <span
        data-testid={`${kind}-${p.dataKey}`}
        data-name={p.name ?? ''}
        data-color={kind === 'bar' ? p.fill : p.stroke}
        data-radius={JSON.stringify(p.radius ?? null)}
        data-stack={p.stackId ?? ''}
      />
    );
    Component.displayName = `Mock${kind}`;
    return Component;
  };
  return {
    ResponsiveContainer: Wrap,
    LineChart: Wrap,
    AreaChart: Wrap,
    BarChart: Wrap,
    PieChart: Wrap,
    Pie: ({ children }: { children?: ReactNode }) => (
      <div data-testid="pie">{children}</div>
    ),
    Cell: ({ fill, fillOpacity }: { fill: string; fillOpacity: number }) => (
      <span
        data-testid="cell"
        data-fill={fill}
        data-opacity={String(fillOpacity)}
      />
    ),
    Line: Series('line'),
    Area: Series('area'),
    Bar: Series('bar'),
    XAxis: () => null,
    YAxis: ({ ticks }: { ticks?: number[] }) => (
      <span data-testid="y-axis" data-ticks={JSON.stringify(ticks ?? null)} />
    ),
    CartesianGrid: () => null,
    Tooltip: () => <span data-testid="tooltip" />,
  };
});

const size = vi.hoisted(() => ({ width: 0, height: 0 }));
vi.mock('@/components/charts/useElementSize', () => ({
  useElementSize: () => [() => {}, size],
}));

import { ChartView } from '@/components/reports/views/ChartView';

const months = ['Jan', 'Feb', 'Mar'];
const sumAmount = { field: 'amount', aggregation: 'sum' } as const;

beforeEach(() => {
  size.width = 0;
  size.height = 0;
});

describe('ChartView cartesian', () => {
  it('shows no series legend for a single series', () => {
    render(
      <ChartView
        data={{
          chartType: 'bar',
          categories: months,
          series: [{ name: 'spend', data: [1, 2, 3] }],
        }}
      />
    );
    expect(
      screen.queryByRole('list', { hidden: true })
    ).not.toBeInTheDocument();
  });

  it('shows a legend with every series label for two or more series', () => {
    render(
      <ChartView
        data={{
          chartType: 'line',
          categories: months,
          series: [
            { name: 'inflow', data: [1, 2, 3] },
            { name: 'outflow', data: [3, 2, 1] },
          ],
        }}
      />
    );
    const legend = screen.getByRole('list', { hidden: true });
    expect(within(legend).getByText('Inflow')).toBeInTheDocument();
    expect(within(legend).getByText('Outflow')).toBeInTheDocument();
  });

  it('colours series by slot in their original order', () => {
    render(
      <ChartView
        data={{
          chartType: 'bar',
          categories: months,
          series: [
            { name: 'a', data: [1, 1, 1] },
            { name: 'b', data: [9, 9, 9] },
          ],
        }}
      />
    );
    expect(screen.getByTestId('bar-a')).toHaveAttribute(
      'data-color',
      'hsl(var(--chart-1))'
    );
    expect(screen.getByTestId('bar-b')).toHaveAttribute(
      'data-color',
      'hsl(var(--chart-2))'
    );
  });

  it('rounds every grouped bar but only the top segment of a stack', () => {
    const series = [
      { name: 'a', data: [1, 1, 1] },
      { name: 'b', data: [2, 2, 2] },
    ];
    const grouped = render(
      <ChartView data={{ chartType: 'bar', categories: months, series }} />
    );
    expect(screen.getByTestId('bar-a')).toHaveAttribute(
      'data-radius',
      '[4,4,0,0]'
    );
    expect(screen.getByTestId('bar-a')).toHaveAttribute('data-stack', '');
    grouped.unmount();

    render(
      <ChartView
        data={{ chartType: 'stackedBar', categories: months, series }}
      />
    );
    expect(screen.getByTestId('bar-a')).toHaveAttribute('data-radius', '0');
    expect(screen.getByTestId('bar-b')).toHaveAttribute(
      'data-radius',
      '[4,4,0,0]'
    );
    expect(screen.getByTestId('bar-a')).toHaveAttribute('data-stack', 'stack');
  });

  it('derives round Y ticks from the largest value, including zero', () => {
    render(
      <ChartView
        data={{
          chartType: 'bar',
          categories: months,
          series: [{ name: 's', data: [12000, 25000, null] }],
        }}
      />
    );
    expect(JSON.parse(screen.getByTestId('y-axis').dataset.ticks!)).toEqual([
      0, 5000, 10000, 15000, 20000, 25000,
    ]);
  });

  it('sizes a stacked axis from per-category sums, with negatives below zero', () => {
    render(
      <ChartView
        data={{
          chartType: 'stackedBar',
          categories: ['Jan', 'Feb'],
          series: [
            { name: 'a', data: [20000, -5000] },
            { name: 'b', data: [30000, -5000] },
          ],
        }}
      />
    );
    // Extent is -10K..50K (not -5K..30K): 20K steps fit it in four intervals.
    expect(JSON.parse(screen.getByTestId('y-axis').dataset.ticks!)).toEqual([
      -20000, 0, 20000, 40000, 60000,
    ]);
  });

  it('folds series past the eighth slot into a neutral "Other" for additive measures', () => {
    const series = Array.from({ length: 10 }, (_, i) => ({
      name: `s${i}`,
      data: [i + 1, i + 1, i + 1],
    }));
    render(
      <ChartView
        data={
          {
            chartType: 'bar',
            categories: months,
            series,
            measure: sumAmount,
          } as never
        }
      />
    );
    // Seven largest keep a slot; s0–s2 (the three smallest) fold.
    for (const folded of ['bar-s0', 'bar-s1', 'bar-s2']) {
      expect(screen.queryByTestId(folded)).not.toBeInTheDocument();
    }
    expect(screen.getByTestId('bar-s3')).toHaveAttribute(
      'data-color',
      'hsl(var(--chart-1))'
    );
    expect(screen.getByTestId('bar-Other')).toHaveAttribute(
      'data-color',
      'hsl(var(--chart-other))'
    );
    expect(screen.getAllByTestId(/^bar-/)).toHaveLength(8);
  });

  it('keeps every series when the measure cannot be summed', () => {
    const series = Array.from({ length: 9 }, (_, i) => ({
      name: `s${i}`,
      data: [i, i, i],
    }));
    render(
      <ChartView
        data={
          {
            chartType: 'line',
            categories: months,
            series,
            measure: { field: 'amount', aggregation: 'avg' },
          } as never
        }
      />
    );
    expect(screen.getAllByTestId(/^line-/)).toHaveLength(9);
    expect(screen.queryByTestId('line-Other')).not.toBeInTheDocument();
  });

  it('mirrors the data into the screen-reader table', () => {
    render(
      <ChartView
        data={{
          chartType: 'area',
          categories: months,
          series: [{ name: 'spend', data: [5, null, 7] }],
        }}
      />
    );
    const table = screen.getByRole('table');
    expect(within(table).getByText('Feb')).toBeInTheDocument();
    expect(within(table).getByText('—')).toBeInTheDocument();
  });
});

describe('ChartView pie / donut', () => {
  const pie = (over: Record<string, unknown> = {}) =>
    ({
      chartType: 'pie',
      categories: ['Dining', 'Travel', 'Groceries'],
      series: [{ name: 'amount', data: [2000, 6000, 2000] }],
      ...over,
    }) as never;

  it('lists slices largest-first with value and share as the text equivalent', () => {
    render(<ChartView data={pie()} />);
    const items = within(
      screen.getByRole('list', { name: 'Chart data' })
    ).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Travel6,00060%',
      'Dining2,00020%',
      'Groceries2,00020%',
    ]);
    // The legend covers everything, so no duplicate hidden table.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('formats as money when the measure is a money field, but not for counts', () => {
    const money = render(<ChartView data={pie({ measure: sumAmount })} />);
    expect(screen.getByText('₹6,000')).toBeInTheDocument();
    money.unmount();
    render(
      <ChartView
        data={pie({ measure: { field: 'amount', aggregation: 'count' } })}
      />
    );
    expect(screen.getByText('6,000')).toBeInTheDocument();
  });

  it('drops zero/negative slices and keeps them reachable in the hidden table', () => {
    render(
      <ChartView
        data={pie({ series: [{ name: 'amount', data: [2000, 0, -50] }] })}
      />
    );
    const items = within(
      screen.getByRole('list', { name: 'Chart data' })
    ).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(
      within(screen.getByRole('table')).getByText('Travel')
    ).toBeInTheDocument();
  });

  it('shows the empty message when no slice is positive', () => {
    render(
      <ChartView
        data={pie({ series: [{ name: 'amount', data: [0, 0, -1] }] })}
      />
    );
    expect(
      screen.getByText('No data for this configuration.')
    ).toBeInTheDocument();
  });

  it('folds slices past the eighth into "Other (n)" with a neutral colour', () => {
    const categories = Array.from({ length: 10 }, (_, i) => `c${i}`);
    size.width = 600;
    size.height = 288;
    render(
      <ChartView
        data={pie({
          categories,
          series: [{ name: 'amount', data: categories.map((_, i) => 100 - i) }],
        })}
      />
    );
    const other = screen.getByText('Other (3)').closest('li')!;
    expect(other).toHaveAttribute('title', 'c7, c8, c9');
    expect(other).toHaveTextContent('276');
    const cells = screen.getAllByTestId('cell');
    expect(cells).toHaveLength(8);
    expect(cells[7]).toHaveAttribute('data-fill', 'hsl(var(--chart-other))');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders no pie until the frame is measured, then sizes it from the frame', () => {
    const { rerender, container } = render(<ChartView data={pie()} />);
    expect(screen.queryByTestId('pie')).not.toBeInTheDocument();

    size.width = 600;
    size.height = 288;
    rerender(<ChartView data={pie({ chartType: 'pie' })} />);
    expect(screen.getByTestId('pie')).toBeInTheDocument();
    const pieBox = screen
      .getByTestId('pie')
      .closest('.relative') as HTMLElement;
    expect(pieBox).toHaveStyle({ width: '270px', height: '270px' });
    expect(container.firstChild).not.toHaveClass('flex-col');
  });

  it('stacks the legend under the pie on narrow frames', () => {
    size.width = 320;
    size.height = 400;
    const { container } = render(<ChartView data={pie()} />);
    expect(container.firstChild).toHaveClass('flex-col');
    expect(screen.getByTestId('pie').closest('.relative')).toHaveClass(
      'w-full'
    );
  });

  it('donut shows the total in the centre and the hovered slice instead', () => {
    size.width = 600;
    size.height = 288;
    render(
      <ChartView data={pie({ chartType: 'donut', measure: sumAmount })} />
    );
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('₹10K')).toBeInTheDocument();
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();

    const travelRow = screen.getByText('Travel').closest('li')!;
    fireEvent.mouseEnter(travelRow);
    expect(screen.getByText('₹6K')).toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
    const opacities = screen
      .getAllByTestId('cell')
      .map((c) => c.dataset.opacity);
    expect(opacities).toEqual(['1', '0.35', '0.35']);

    fireEvent.mouseLeave(travelRow);
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('plain pie keeps a hover tooltip and has no centre label', () => {
    size.width = 600;
    size.height = 288;
    render(<ChartView data={pie()} />);
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });
});
