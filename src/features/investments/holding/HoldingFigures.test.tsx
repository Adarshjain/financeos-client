import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { holding, instrument } from './holding.fixtures';
import { PositionCard } from './HoldingFigures';
import { holdingFigures } from './holdingModel';

describe('PositionCard', () => {
  const figures = holdingFigures(holding, instrument as never);

  it('shows only the figures the hero does not, as figures', () => {
    render(<PositionCard figures={figures} onOverride={vi.fn()} />);
    for (const label of ['Quantity', 'Avg cost', 'LTP', 'Realised P&L', 'Total charges']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const label of ['Invested', '₹ return', 'XIRR']) expect(screen.queryByText(label)).toBeNull();
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('keeps the override link under LTP', () => {
    const onOverride = vi.fn();
    render(<PositionCard figures={figures} onOverride={onOverride} />);
    fireEvent.click(screen.getByRole('button', { name: 'override' }));
    expect(onOverride).toHaveBeenCalled();
  });
});
