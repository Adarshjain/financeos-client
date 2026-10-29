import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { UpcomingTile } from './upcomingModel';
import { UpcomingTotals } from './UpcomingTotals';

const tile = (id: UpcomingTile['id'], over: Partial<UpcomingTile> = {}): UpcomingTile => ({
  id,
  label: id,
  value: '₹1',
  tone: 'ink',
  caption: 'c',
  ...over,
});

describe('UpcomingTotals', () => {
  it('draws nothing without a tile', () => {
    const { container } = render(<UpcomingTotals tiles={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Next 7 days is the headline with its count line; Overdue and Due back are the figures', () => {
    render(
      <UpcomingTotals
        tiles={[
          tile('overdue', { label: 'Overdue', value: '₹9', tone: 'danger', caption: '1 EMI' }),
          tile('next7', { label: 'Next 7 days', value: '₹33,900', caption: '2 EMIs' }),
          tile('month', { label: 'This month', value: '₹5', caption: '3 items' }),
          tile('dueBack', { label: 'Due back to you', value: '+₹15,000', tone: 'positive', caption: 'Priya · 31 Dec' }),
        ]}
      />,
    );
    expect(screen.getByText('Next 7 days')).toBeInTheDocument();
    expect(screen.getByText('₹33,900')).toBeInTheDocument();
    expect(screen.getByText('2 EMIs')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('1 EMI')).toBeInTheDocument();
    expect(screen.getByText('Due back to you')).toBeInTheDocument();
    expect(screen.getByText('Priya · 31 Dec')).toBeInTheDocument();
    expect(screen.queryByText('This month')).toBeNull();
  });

  it('shows ₹0 for the headline when nothing falls in the next 7 days', () => {
    render(<UpcomingTotals tiles={[tile('overdue', { label: 'Overdue', value: '₹9', tone: 'danger' })]} />);
    expect(screen.getByText('₹0')).toBeInTheDocument();
  });
});
