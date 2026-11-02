import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LazyChart, preloadChart, useChartReady } from './LazyChart';

vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: (props: { fill?: boolean }) => <div data-testid="chart" data-fill={String(Boolean(props.fill))} />,
}));

const data = { chartType: 'bar' as const, categories: ['A'], series: [{ name: 'S', values: [1] }] };

describe('LazyChart', () => {
  // First: the module's loaded state is shared, so the skeleton can only be seen before any test has loaded the chart.
  it('draws a chart-sized skeleton while loading', () => {
    const { container } = render(<LazyChart data={data as never} />);
    expect(screen.queryByTestId('chart')).toBeNull();
    const sk = container.querySelector('.aspect-video') as HTMLElement;
    expect(sk).not.toBeNull();
    // The chart's aspect ratio, not Skeleton's own 12px height (which drew a thin line).
    expect(sk.className).toContain('h-auto');
    expect(sk.className).not.toContain('h-space-12');
  });

  it('shows the chart once its code has loaded, passing the props through', async () => {
    render(<LazyChart data={data as never} fill />);
    expect(await screen.findByTestId('chart')).toHaveAttribute('data-fill', 'true');
  });

  it('preloads the chart code once, and reports it ready after', async () => {
    const first = preloadChart();
    expect(preloadChart()).toBe(first);
    await first;
    const { result } = renderHook(() => useChartReady(true));
    expect(result.current).toBe(true);
  });

  it('is ready once the code is in, whether or not the caller asked for it', async () => {
    await act(async () => {
      await preloadChart();
    });
    expect(renderHook(() => useChartReady(false)).result.current).toBe(true);
  });

  it('draws the chart in the first render once its code is in, with no skeleton in between', async () => {
    await act(async () => {
      await preloadChart();
    });
    render(<LazyChart data={data as never} />);
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });
});
