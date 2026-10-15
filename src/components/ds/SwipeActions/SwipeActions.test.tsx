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

  it('renders revealed left action for transactions variant and triggers onApprove', () => {
    const handleApprove = vi.fn();

    render(
      <SwipeActions
        variant="transactions"
        revealed="left"
        onApprove={handleApprove}
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    expect(approveBtn).toBeInTheDocument();
    expect(approveBtn).toHaveAttribute('tabIndex', '0');

    fireEvent.click(approveBtn);
    expect(handleApprove).toHaveBeenCalledTimes(1);
  });

  it('renders revealed right action for transactions variant and triggers onDelete', () => {
    const handleDelete = vi.fn();

    render(
      <SwipeActions
        variant="transactions"
        revealed="right"
        onDelete={handleDelete}
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).toHaveAttribute('tabIndex', '0');

    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('renders revealed actions for inbox variant (Snooze and Dismiss)', () => {
    const handleSnooze = vi.fn();
    const handleDismiss = vi.fn();

    const { rerender } = render(
      <SwipeActions
        variant="inbox"
        revealed="left"
        onSnooze={handleSnooze}
        onDismiss={handleDismiss}
      >
        <div>Inbox row</div>
      </SwipeActions>,
    );

    const snoozeBtn = screen.getByRole('button', { name: 'Snooze' });
    expect(snoozeBtn).toBeInTheDocument();
    fireEvent.click(snoozeBtn);
    expect(handleSnooze).toHaveBeenCalledTimes(1);

    rerender(
      <SwipeActions
        variant="inbox"
        revealed="right"
        onSnooze={handleSnooze}
        onDismiss={handleDismiss}
      >
        <div>Inbox row</div>
      </SwipeActions>,
    );

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
    expect(dismissBtn).toBeInTheDocument();
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('hides unrevealed action buttons from tab order with tabIndex -1', () => {
    render(
      <SwipeActions
        variant="transactions"
        revealed="none"
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const approveBtn = screen.getByRole('button', { name: 'Approve', hidden: true });
    const deleteBtn = screen.getByRole('button', { name: 'Delete', hidden: true });
    expect(approveBtn).toHaveAttribute('tabIndex', '-1');
    expect(deleteBtn).toHaveAttribute('tabIndex', '-1');
  });

  it('handles pointer swipe right gesture to reveal left action', () => {
    const handleRevealedChange = vi.fn();

    const { container } = render(
      <SwipeActions
        onRevealedChange={handleRevealedChange}
        variant="transactions"
      >
        <div>Swipeable row</div>
      </SwipeActions>,
    );

    const swipeRoot = container.firstChild as HTMLElement;

    // Drag right past threshold (startX: 100, endX: 180 = delta +80 > 48px)
    fireEvent.pointerDown(swipeRoot, { clientX: 100, clientY: 50, button: 0 });
    fireEvent.pointerMove(swipeRoot, { clientX: 180, clientY: 50 });
    fireEvent.pointerUp(swipeRoot);

    expect(handleRevealedChange).toHaveBeenCalledWith('left');
  });

  it('handles pointer swipe left gesture to reveal right action', () => {
    const handleRevealedChange = vi.fn();

    const { container } = render(
      <SwipeActions
        onRevealedChange={handleRevealedChange}
        variant="transactions"
      >
        <div>Swipeable row</div>
      </SwipeActions>,
    );

    const swipeRoot = container.firstChild as HTMLElement;

    // Drag left past threshold (startX: 200, endX: 120 = delta -80 < -48px)
    fireEvent.pointerDown(swipeRoot, { clientX: 200, clientY: 50, button: 0 });
    fireEvent.pointerMove(swipeRoot, { clientX: 120, clientY: 50 });
    fireEvent.pointerUp(swipeRoot);

    expect(handleRevealedChange).toHaveBeenCalledWith('right');
  });

  it('springs back to none when drag does not reach threshold', () => {
    const handleRevealedChange = vi.fn();

    const { container } = render(
      <SwipeActions
        onRevealedChange={handleRevealedChange}
        variant="transactions"
      >
        <div>Swipeable row</div>
      </SwipeActions>,
    );

    const swipeRoot = container.firstChild as HTMLElement;

    // Drag right below threshold (startX: 100, endX: 120 = delta +20 < 48px)
    fireEvent.pointerDown(swipeRoot, { clientX: 100, clientY: 50, button: 0 });
    fireEvent.pointerMove(swipeRoot, { clientX: 120, clientY: 50 });
    fireEvent.pointerUp(swipeRoot);

    expect(handleRevealedChange).toHaveBeenCalledWith('none');
  });

  it('springs back when row needs no approval (canApprove=false)', () => {
    const handleRevealedChange = vi.fn();

    const { container } = render(
      <SwipeActions
        onRevealedChange={handleRevealedChange}
        variant="transactions"
        canApprove={false}
      >
        <div>Row needing no approval</div>
      </SwipeActions>,
    );

    const swipeRoot = container.firstChild as HTMLElement;

    // Attempt drag right on row that cannot approve
    fireEvent.pointerDown(swipeRoot, { clientX: 100, clientY: 50, button: 0 });
    fireEvent.pointerMove(swipeRoot, { clientX: 180, clientY: 50 });
    fireEvent.pointerUp(swipeRoot);

    expect(handleRevealedChange).toHaveBeenCalledWith('none');
  });

  it('cancels drag if vertical scroll motion is detected', () => {
    const handleRevealedChange = vi.fn();

    const { container } = render(
      <SwipeActions
        onRevealedChange={handleRevealedChange}
        variant="transactions"
      >
        <div>Scrollable row</div>
      </SwipeActions>,
    );

    const swipeRoot = container.firstChild as HTMLElement;

    // Start drag, then move vertically more than horizontally (deltaY: 30, deltaX: 10)
    fireEvent.pointerDown(swipeRoot, { clientX: 100, clientY: 50, button: 0 });
    fireEvent.pointerMove(swipeRoot, { clientX: 110, clientY: 80 });
    fireEvent.pointerUp(swipeRoot);

    // Should not trigger swipe reveal because vertical scroll took precedence
    expect(handleRevealedChange).not.toHaveBeenCalledWith('left');
    expect(handleRevealedChange).not.toHaveBeenCalledWith('right');
  });

  it('closes revealed panel on tap', () => {
    const handleRevealedChange = vi.fn();

    const { container } = render(
      <SwipeActions
        revealed="left"
        onRevealedChange={handleRevealedChange}
        variant="transactions"
      >
        <div>Revealed row</div>
      </SwipeActions>,
    );

    const swipeRoot = container.firstChild as HTMLElement;

    // Simple tap without movement
    fireEvent.pointerDown(swipeRoot, { clientX: 100, clientY: 50, button: 0 });
    fireEvent.pointerUp(swipeRoot, { clientX: 100, clientY: 50 });

    expect(handleRevealedChange).toHaveBeenCalledWith('none');
  });
});
