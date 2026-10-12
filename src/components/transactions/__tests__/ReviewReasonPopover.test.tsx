import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewReasonPopover } from '@/components/transactions/review-filter-bar/ReviewReasonPopover';

describe('ReviewReasonPopover', () => {
  it('shows "All Reasons" on the pill when no reason is picked', () => {
    render(<ReviewReasonPopover activeReasonFilter="ALL" onReasonFilterChange={vi.fn()} />);

    const pill = screen.getByRole('button', { name: 'All Reasons' });
    expect(pill).not.toHaveClass('bg-emerald-500/10');
  });

  it('shows the picked reason on the pill in the active style', () => {
    render(<ReviewReasonPopover activeReasonFilter="DATE_CORRECTED" onReasonFilterChange={vi.fn()} />);

    const pill = screen.getByRole('button', { name: 'Date corrected' });
    // filter-active variant
    expect(pill).toHaveClass('bg-emerald-500/10');
  });

  it('lists every reason, with All Reasons first, only once opened', () => {
    render(<ReviewReasonPopover activeReasonFilter="ALL" onReasonFilterChange={vi.fn()} />);
    expect(screen.queryByText('Unreconciled')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All Reasons' }));

    expect(screen.getByText('Review Reason')).toBeInTheDocument();
    const options = screen
      .getAllByRole('button')
      .map((b) => b.textContent)
      .slice(1);
    expect(options).toEqual([
      'All Reasons',
      'Unreconciled',
      'Category unverified',
      'Possible duplicate',
      'Date corrected',
      'Other',
    ]);
  });

  it('picking a reason reports it and closes the menu', () => {
    const onReasonFilterChange = vi.fn();
    render(<ReviewReasonPopover activeReasonFilter="ALL" onReasonFilterChange={onReasonFilterChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'All Reasons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Date corrected' }));

    expect(onReasonFilterChange).toHaveBeenCalledWith('DATE_CORRECTED');
    expect(screen.queryByText('Review Reason')).not.toBeInTheDocument();
  });

  it('picking All Reasons clears the reason filter', () => {
    const onReasonFilterChange = vi.fn();
    render(<ReviewReasonPopover activeReasonFilter="UNRECONCILED" onReasonFilterChange={onReasonFilterChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Unreconciled' }));
    // The open menu repeats the active label; pick the All Reasons row.
    fireEvent.click(screen.getByRole('button', { name: 'All Reasons' }));

    expect(onReasonFilterChange).toHaveBeenCalledWith('ALL');
  });
});
