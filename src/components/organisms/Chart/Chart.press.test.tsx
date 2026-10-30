import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const size = vi.hoisted(() => ({ width: 600, height: 240 }));
vi.mock('@/lib/charts/useElementSize', () => ({
  useElementSize: () => [() => {}, size],
}));

import { Chart } from '@/components/organisms/Chart/Chart';

const months = ['Jan', 'Feb', 'Mar'];
const sum = { field: 'amount', aggregation: 'sum' } as const;

beforeEach(() => {
  size.width = 600;
  size.height = 240;
});

const bars = () => Array.from(document.querySelectorAll('path[data-bar]'));
const slice = (i: number) => document.querySelector(`path[data-slice="${i}"]`)!;

describe('Chart sparkline', () => {
  it('draws one series as an area in chart-1 with no axes, grid or tooltip', () => {
    render(
      <Chart
        data={{
          chartType: 'sparkline',
          categories: months,
          series: [{ name: 'net worth', data: [1, 3, 2] }],
          measure: sum,
        }}
      />
    );
    const container = document.body;
    expect(container.querySelector('path[stroke="var(--ds-chart-1)"]')).toBeInTheDocument();
    expect(container.querySelector('path[fill^="url(#"]')).toBeInTheDocument();
    expect(container.querySelector('text')).toBeNull();
    expect(container.querySelector('line')).toBeNull();
    expect(container.querySelector('.z-floating')).toBeNull();
  });
});

describe('Chart press', () => {
  const bar = {
    chartType: 'bar' as const,
    categories: months,
    series: [{ name: 'spend', data: [10, 20, 30] }],
    measure: sum,
  };

  it('reports the pressed bar as an entry', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={bar} onSelectEntry={onSelectEntry} />);
    fireEvent.click(bars()[1]);
    expect(onSelectEntry).toHaveBeenCalledWith({
      key: 'Feb',
      label: 'Feb',
      seriesKey: 'Spend',
      value: 20,
      index: 1,
    });
  });

  it('makes nothing pressable without a callback', () => {
    render(<Chart data={bar} />);
    expect(bars()).toHaveLength(3);
    expect(bars().some((b) => b.getAttribute('class')?.includes('cursor-pointer'))).toBe(false);
    fireEvent.click(bars()[1]);
  });

  it('reports a pressed line point from its hover dot, and not one canSelect rejects', () => {
    const line = { ...bar, chartType: 'line' as const };
    const onSelectEntry = vi.fn();
    const { unmount } = render(<Chart data={line} onSelectEntry={onSelectEntry} />);
    const svg = document.querySelector('svg.absolute')!;
    fireEvent.pointerMove(svg, { clientX: 300, clientY: 100, pointerType: 'mouse' });
    fireEvent.click(svg.querySelector('circle')!);
    expect(onSelectEntry).toHaveBeenCalledWith({ key: 'Feb', label: 'Feb', seriesKey: 'Spend', value: 20, index: 1 });
    unmount();

    const rejecting = vi.fn();
    render(<Chart data={line} onSelectEntry={rejecting} canSelectEntry={() => false} />);
    const again = document.querySelector('svg.absolute')!;
    fireEvent.pointerMove(again, { clientX: 300, clientY: 100, pointerType: 'mouse' });
    fireEvent.click(again.querySelector('circle')!);
    expect(rejecting).not.toHaveBeenCalled();
  });

  const pie = {
    chartType: 'pie' as const,
    categories: ['Food', 'Travel'],
    series: [{ name: 'spend', data: [60, 40] }],
    measure: sum,
  };

  it('reports a pressed slice and a pressed legend row', () => {
    size.width = 800;
    size.height = 300;
    const onSelectEntry = vi.fn();
    render(<Chart data={pie} onSelectEntry={onSelectEntry} />);
    fireEvent.click(slice(1));
    expect(onSelectEntry).toHaveBeenLastCalledWith({
      key: 'Travel',
      label: 'Travel',
      seriesKey: 'Spend',
      value: 40,
      index: 1,
    });
    const list = screen.getByRole('list', { name: 'Chart data' });
    fireEvent.click(within(list).getByRole('button', { name: /Food/ }));
    expect(onSelectEntry).toHaveBeenLastCalledWith({
      key: 'Food',
      label: 'Food',
      seriesKey: 'Spend',
      value: 60,
      index: 0,
    });
  });

  it('has no legend buttons without a callback', () => {
    render(<Chart data={pie} />);
    const list = screen.getByRole('list', { name: 'Chart data' });
    expect(within(list).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Chart heatmap', () => {
  const heat = {
    chartType: 'heatmap' as const,
    // Mon 2026-01-05 … Sun 2026-01-11
    categories: ['2026-01-05', '2026-01-06', '2026-01-08'],
    series: [{ name: 'spend', data: [100, 400, 0] }],
    measure: sum,
    meta: { dateRange: { from: '2026-01-05', to: '2026-01-11' } },
  } as never;

  it('lays one week out as a column of seven days, empty days neutral, heavy days darker', () => {
    const { container } = render(<Chart data={heat} />);
    expect(screen.getByTestId('heatmap-grid')).toHaveAttribute('data-weeks', '1');
    expect(container.querySelectorAll('[data-date]')).toHaveLength(7);
    expect(container.querySelector('[data-date="2026-01-08"]')).toHaveAttribute('data-level', '0');
    const light = Number(container.querySelector('[data-date="2026-01-05"]')?.getAttribute('data-level'));
    const heavy = Number(container.querySelector('[data-date="2026-01-06"]')?.getAttribute('data-level'));
    expect(heavy).toBeGreaterThan(light);
    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('reports a pressed day with a value as an entry', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={heat} money={false} onSelectEntry={onSelectEntry} />);
    fireEvent.click(screen.getByRole('button', { name: /06\/01\/26/ }));
    expect(onSelectEntry).toHaveBeenCalledWith({
      key: '2026-01-06',
      label: '06/01/26',
      value: 400,
    });
    // A day with no value is not pressable.
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('has no pressable cells without a callback', () => {
    render(<Chart data={heat} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the empty state when no day has a value', () => {
    render(
      <Chart
        data={{
          chartType: 'heatmap',
          categories: ['2026-01-05'],
          series: [{ name: 'spend', data: [0] }],
          meta: { dateRange: { from: '2026-01-05', to: '2026-01-11' } },
        } as never}
      />
    );
    expect(screen.getByText('No data for this configuration.')).toBeInTheDocument();
  });
});
