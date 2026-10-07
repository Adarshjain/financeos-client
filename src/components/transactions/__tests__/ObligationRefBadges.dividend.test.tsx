import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ObligationRefBadges } from '@/components/transactions/ObligationRefBadges';
import type { ObligationRef } from '@/lib/transaction.types';

const dividendRef: ObligationRef = {
  kind: 'DIVIDEND',
  id: 'div-1',
  parentId: 'inst-9',
  label: 'Dividend · INFY',
  amount: 1200,
};

describe('ObligationRefBadges DIVIDEND', () => {
  it('links to the instrument dividends page and uses the Coins icon', () => {
    const { container } = render(<ObligationRefBadges refs={[dividendRef]} />);
    expect(screen.getByText('Dividend · INFY')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/investments/dividends?instrumentId=inst-9',
    );
    expect(container.querySelector('svg.lucide-coins')).not.toBeNull();
  });

  it('renders a plain badge (no link) when parentId is missing', () => {
    const { container } = render(<ObligationRefBadges refs={[{ ...dividendRef, parentId: null }]} />);
    expect(screen.getByText('Dividend · INFY')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('svg.lucide-coins')).not.toBeNull();
  });

  it('does not bubble clicks to the wrapping card', () => {
    const onParent = vi.fn();
    render(
      <div onClick={onParent}>
        <ObligationRefBadges refs={[dividendRef]} />
      </div>,
    );
    fireEvent.click(screen.getByRole('link'));
    expect(onParent).not.toHaveBeenCalled();
  });
});
