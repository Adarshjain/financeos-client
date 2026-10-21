import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewSummaryDialog } from './ReviewSummaryDialog';

describe('ReviewSummaryDialog', () => {
  it('is closed without a summary', () => {
    render(<ReviewSummaryDialog summary={null} onClose={() => {}} />);
    expect(screen.queryByText('Approve summary')).toBeNull();
  });

  it('shows the counts, skipped rows and each failure with its reason', () => {
    const onClose = vi.fn();
    render(
      <ReviewSummaryDialog
        summary={{
          succeededCount: 4,
          skippedCount: 1,
          skips: ['IKEA'],
          failures: [{ description: 'Swiggy', reason: 'Transaction not found' }],
        }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('No ticked reason on that row')).toBeTruthy();
    expect(screen.getByText('IKEA')).toBeTruthy();
    expect(screen.getByText('Swiggy')).toBeTruthy();
    expect(screen.getByText('Transaction not found')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });

  it('leaves out the lists that are empty', () => {
    render(<ReviewSummaryDialog summary={{ succeededCount: 2, skippedCount: 0, skips: [], failures: [] }} onClose={() => {}} />);
    expect(screen.queryByText('Skipped rows')).toBeNull();
    expect(screen.queryByText('Failed rows')).toBeNull();
  });
});
