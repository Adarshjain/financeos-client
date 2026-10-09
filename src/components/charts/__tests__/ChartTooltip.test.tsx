import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartTooltipContent } from '@/components/charts/ChartTooltip';

const fmt = (v: number) => `₹${v}`;
const payload = [
  { name: 'Food', value: 100, color: 'red' },
  { name: 'Travel', value: 250, color: 'blue' },
];

describe('ChartTooltipContent', () => {
  it('renders nothing when inactive or without payload', () => {
    const { container, rerender } = render(
      <ChartTooltipContent active={false} payload={payload} format={fmt} />
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<ChartTooltipContent active payload={[]} format={fmt} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the hovered category and every series value, formatted', () => {
    render(
      <ChartTooltipContent
        active
        label="Jul 2026"
        payload={payload}
        format={fmt}
      />
    );
    expect(screen.getByText('Jul 2026')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
    expect(screen.getByText('₹250')).toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('skips entries whose value is not a number (gaps in a series)', () => {
    render(
      <ChartTooltipContent
        active
        label="Aug"
        payload={[...payload, { name: 'Gap', value: null }]}
        format={fmt}
      />
    );
    expect(screen.queryByText('Gap')).not.toBeInTheDocument();
  });

  it('renders nothing when every entry is a gap', () => {
    const { container } = render(
      <ChartTooltipContent
        active
        payload={[{ name: 'Gap', value: null }]}
        format={fmt}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('adds a total row for stacks with more than one series', () => {
    render(
      <ChartTooltipContent
        active
        label="Jul"
        payload={payload}
        format={fmt}
        showTotal
      />
    );
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('₹350')).toBeInTheDocument();
  });

  it('omits the total for a single-series stack', () => {
    render(
      <ChartTooltipContent
        active
        payload={[payload[0]]}
        format={fmt}
        showTotal
      />
    );
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('prefers the explicit colour map over the colour Recharts reports', () => {
    const { container } = render(
      <ChartTooltipContent
        active
        payload={payload}
        format={fmt}
        colors={{ Food: 'green' }}
      />
    );
    const keys = container.querySelectorAll('span[aria-hidden]');
    expect(keys[0]).toHaveStyle({ background: 'green' });
    expect(keys[1]).toHaveStyle({ background: 'blue' });
  });

  it('renders a custom title and footer from the payload', () => {
    render(
      <ChartTooltipContent
        active
        label="x"
        payload={[{ name: 'Price', value: 10, payload: { source: 'AMFI' } }]}
        format={fmt}
        title={() => 'Custom heading'}
        footer={(p) => `Source: ${String(p[0].payload?.source)}`}
      />
    );
    expect(screen.getByText('Custom heading')).toBeInTheDocument();
    expect(screen.getByText('Source: AMFI')).toBeInTheDocument();
  });
});
