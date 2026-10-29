import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LazyChart } from './LazyChart';

vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: (props: { fill?: boolean }) => <div data-testid="chart" data-fill={String(Boolean(props.fill))} />,
}));

const data = { chartType: 'bar' as const, categories: ['A'], series: [{ name: 'S', values: [1] }] };

describe('LazyChart', () => {
  it('shows the chart once its code has loaded, passing the props through', async () => {
    render(<LazyChart data={data as never} fill />);
    expect(await screen.findByTestId('chart')).toHaveAttribute('data-fill', 'true');
  });

  it('draws a chart-sized skeleton while loading', () => {
    const { container } = render(<LazyChart data={data as never} />);
    expect(screen.queryByTestId('chart')).toBeNull();
    expect(container.querySelector('.aspect-video')).not.toBeNull();
  });
});
