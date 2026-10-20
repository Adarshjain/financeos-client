import '@/test/next-mocks';

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { CreditCardTile } from '../components/CreditCardTile';

const card = (over: Record<string, unknown>) =>
  ({
    id: 'c1',
    name: 'HDFC Regalia',
    type: 'credit_card',
    last4: '1234',
    creditLimit: 100000,
    balance: -46000,
    excludeFromNetAsset: false,
    financialPosition: 'liability',
    closedOn: null,
    balanceAnchored: false,
    anchorDate: null,
    reconciliationGap: null,
    warnings: [],
    ...over,
  }) as never;

const bar = (container: HTMLElement) => container.querySelector('.h-1\\.5 > div') as HTMLElement;

describe('CreditCardTile utilisation', () => {
  it('shows the server utilisation with the shared amber band (30–70)', () => {
    const { container } = renderWithQuery(<CreditCardTile account={card({ utilizationPct: 46 })} />);
    expect(screen.getByText('46.0%')).toHaveClass('text-amber-600');
    expect(bar(container)).toHaveClass('bg-amber-500');
    expect(bar(container).style.width).toBe('46%');
  });

  it('emerald below 30 and rose from 70, the bar capped at 100%', () => {
    const { container, unmount } = renderWithQuery(<CreditCardTile account={card({ utilizationPct: 29.9 })} />);
    expect(bar(container)).toHaveClass('bg-emerald-500');
    expect(screen.getByText('29.9%')).toHaveClass('text-emerald-600');
    unmount();
    const second = renderWithQuery(<CreditCardTile account={card({ utilizationPct: 140 })} />);
    expect(bar(second.container)).toHaveClass('bg-rose-500');
    expect(bar(second.container).style.width).toBe('100%');
    expect(screen.getByText('140.0%')).toHaveClass('text-rose-600');
  });

  it('a card in credit reads the server 0%, not its absolute balance', () => {
    const { container } = renderWithQuery(<CreditCardTile account={card({ balance: 25000, utilizationPct: 0 })} />);
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(bar(container).style.width).toBe('0%');
  });

  it('no server utilisation (no limit) shows a dash and an empty bar', () => {
    const { container } = renderWithQuery(<CreditCardTile account={card({ creditLimit: 0, utilizationPct: null })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(bar(container).style.width).toBe('0%');
  });

  it('the Credit Limit line shows the effective limit behind the percent (the statement limit when the card has none)', () => {
    const { unmount } = renderWithQuery(
      <CreditCardTile account={card({ creditLimit: 0, effectiveCreditLimit: 92000, utilizationPct: 50 })} />,
    );
    expect(screen.getByText('₹92,000.00')).toBeInTheDocument();
    expect(screen.queryByText('₹0.00')).not.toBeInTheDocument();
    unmount();
    renderWithQuery(<CreditCardTile account={card({ creditLimit: 0, effectiveCreditLimit: null, utilizationPct: null })} />);
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });
});
