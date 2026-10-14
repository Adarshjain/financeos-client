import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SwipeActions } from './SwipeActions';

describe('SwipeActions', () => {
  it('renders children content', () => {
    render(
      <SwipeActions>
        <div>Swiggy Bangalore ₹1,249</div>
      </SwipeActions>,
    );

    expect(screen.getByText('Swiggy Bangalore ₹1,249')).toBeInTheDocument();
  });

  it('renders revealed left action and triggers onAction callback', () => {
    const handleApprove = vi.fn();

    render(
      <SwipeActions
        revealed="left"
        leftAction={{
          label: 'Approve',
          onAction: handleApprove,
        }}
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    expect(approveBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);
    expect(handleApprove).toHaveBeenCalledTimes(1);
  });

  it('renders revealed right action and triggers onAction callback', () => {
    const handleDelete = vi.fn();

    render(
      <SwipeActions
        revealed="right"
        rightAction={{
          label: 'Delete',
          tone: 'danger',
          onAction: handleDelete,
        }}
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('handles pointer swipe gesture to reveal action', () => {
    const handleRevealedChange = vi.fn();

    const { container } = render(
      <SwipeActions
        onRevealedChange={handleRevealedChange}
        leftAction={{ label: 'Approve' }}
        rightAction={{ label: 'Delete' }}
      >
        <div>Swipeable row</div>
      </SwipeActions>,
    );

    const swipeRoot = container.firstChild as HTMLElement;

    // Simulate drag right (over threshold of 48px)
    fireEvent.pointerDown(swipeRoot, { clientX: 100 });
    fireEvent.pointerMove(swipeRoot, { clientX: 180 });
    fireEvent.pointerUp(swipeRoot);

    expect(handleRevealedChange).toHaveBeenCalledWith('left');
  });

  it('disables swipe and click when action is disabled', () => {
    const handleApprove = vi.fn();

    render(
      <SwipeActions
        revealed="left"
        leftAction={{
          label: 'Approve',
          disabled: true,
          onAction: handleApprove,
        }}
      >
        <div>Row</div>
      </SwipeActions>,
    );

    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    expect(approveBtn).toBeDisabled();
  });
});
