import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ChatStat,
  ChatStatCards,
} from '../ChatStatCards';

describe('ChatStatCards', () => {
  it('renders stat labels, values, and deltas with sentiment classes', () => {
    const stats: ChatStat[] = [
      {
        label: 'Total Spend',
        value: '₹42,180',
        delta: '+12.4% vs July',
        sentiment: 'bad',
      },
      {
        label: 'Savings Rate',
        value: '35%',
        delta: '+5% vs target',
        sentiment: 'good',
      },
      {
        label: 'Active Accounts',
        value: '4',
        sentiment: 'neutral',
      },
    ];

    const { container } = render(<ChatStatCards stats={stats} />);

    expect(screen.getByText('Total Spend')).toBeInTheDocument();
    expect(screen.getByText('₹42,180')).toBeInTheDocument();
    const badDelta = screen.getByText('+12.4% vs July');
    expect(badDelta).toBeInTheDocument();
    expect(badDelta.className).toContain('text-rose-600');

    expect(screen.getByText('Savings Rate')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    const goodDelta = screen.getByText('+5% vs target');
    expect(goodDelta).toBeInTheDocument();
    expect(goodDelta.className).toContain('text-emerald-600');

    expect(screen.getByText('Active Accounts')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    expect(container.querySelectorAll('.grid > div')).toHaveLength(3);
  });

  it('renders null when stats array is empty', () => {
    const { container } = render(<ChatStatCards stats={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
