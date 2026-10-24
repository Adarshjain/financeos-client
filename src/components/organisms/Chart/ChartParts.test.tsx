import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartLegend, ChartTooltip } from './ChartParts';

const format = (v: number) => `₹${v.toLocaleString('en-IN')}`;

describe('ChartTooltip', () => {
  it('renders nothing when inactive or without numeric values', () => {
    const { container, rerender } = render(
      <ChartTooltip format={format} payload={[{ name: 'Spend', value: 1 }]} />
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <ChartTooltip
        active
        format={format}
        payload={[{ name: 'Spend', value: null }]}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the category, each series value formatted, and a total for stacks', () => {
    render(
      <ChartTooltip
        active
        showTotal
        format={format}
        label="Oct"
        colors={{ Food: 'var(--ds-chart-1)' }}
        payload={[
          { name: 'Food', value: 123456 },
          { name: 'Travel', value: 1000, color: 'var(--ds-chart-2)' },
        ]}
      />
    );
    expect(screen.getByText('Oct')).toBeInTheDocument();
    expect(screen.getByText('₹1,23,456')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('₹1,24,456')).toBeInTheDocument();
  });

  it('omits the total for a single series', () => {
    render(
      <ChartTooltip
        active
        showTotal
        format={format}
        payload={[{ name: 'Food', value: 5 }]}
      />
    );
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });
});

describe('ChartLegend', () => {
  it('lists every series name', () => {
    render(
      <ChartLegend
        line
        items={[
          { name: 'Income', color: 'var(--ds-chart-1)' },
          { name: 'Spend', color: 'var(--ds-chart-2)' },
        ]}
      />
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Spend')).toBeInTheDocument();
  });
});
