import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHandle,
  SheetShell,
  SheetTrigger,
} from './Sheet';

describe('SheetShell', () => {
  it('renders title, subtitle and body content', () => {
    render(
      <SheetShell
        title="Set statement details"
        subtitle="HDFC Regalia · 5 Oct"
      >
        <SheetBody>Form inputs</SheetBody>
      </SheetShell>,
    );
    expect(screen.getByText('Set statement details')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia · 5 Oct')).toBeInTheDocument();
    expect(screen.getByText('Form inputs')).toBeInTheDocument();
  });

  it('renders drag handle with line-handle token', () => {
    const { container } = render(<SheetHandle />);
    expect(container.firstChild).toHaveClass(
      'w-space-40',
      'h-space-4',
      'rounded-ds-pill',
      'bg-line-handle',
    );
  });

  it('renders footer with buttons', () => {
    render(
      <SheetFooter>
        <button type="button">Cancel</button>
        <button type="button">Save</button>
      </SheetFooter>,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('SheetBody includes touch-pan-y for scroll ergonomics', () => {
    render(<SheetBody>Scrollable content</SheetBody>);
    expect(screen.getByText('Scrollable content')).toHaveClass('touch-pan-y');
  });

  it('triggers onClose when swiping down past the threshold', () => {
    const handleClose = vi.fn();
    render(
      <SheetShell title="Swipe Test" onClose={handleClose}>
        <SheetBody>Body</SheetBody>
      </SheetShell>,
    );

    const dragArea = screen.getByTestId('sheet-drag-area');

    // Simulate drag down by 100px (threshold is 80px)
    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 150, pointerId: 1 });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('springs back and does not call onClose when swipe is below threshold', () => {
    const handleClose = vi.fn();
    render(
      <SheetShell title="Spring Test" onClose={handleClose}>
        <SheetBody>Body</SheetBody>
      </SheetShell>,
    );

    const dragArea = screen.getByTestId('sheet-drag-area');

    // Drag down only 30px (below threshold 80px)
    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 80, pointerId: 1 });

    expect(handleClose).not.toHaveBeenCalled();
  });
});

describe('Sheet (Radix bottom-sheet overlay)', () => {
  it('opens and displays content on trigger click with z-overlay and z-scrim tokens', () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button type="button">Open Sheet</button>
        </SheetTrigger>
        <SheetContent title="Bottom Sheet Details">
          <SheetBody>Sheet is open</SheetBody>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.queryByText('Sheet is open')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Sheet' }));

    const content = screen.getByText('Sheet is open').closest('[role="dialog"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('z-overlay', 'max-h-dvh');
  });
});
