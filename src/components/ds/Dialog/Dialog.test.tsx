import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogShell,
  DialogTrigger,
} from './Dialog';

describe('DialogShell', () => {
  it('renders title, description and content', () => {
    render(
      <DialogShell
        title="Approve 9 transactions"
        description="Clears the reasons you tick."
      >
        <DialogBody>Modal body content</DialogBody>
      </DialogShell>,
    );
    expect(screen.getByText('Approve 9 transactions')).toBeInTheDocument();
    expect(
      screen.getByText('Clears the reasons you tick.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Modal body content')).toBeInTheDocument();
  });

  it('applies correct size classes for dialog tokens', () => {
    const { container: c1 } = render(<DialogShell size="sm" title="Small" />);
    expect(c1.firstChild).toHaveClass('sm:max-w-dialog-sm');

    const { container: c2 } = render(<DialogShell size="md" title="Default" />);
    expect(c2.firstChild).toHaveClass('sm:max-w-dialog-md');

    const { container: c3 } = render(<DialogShell size="lg" title="Large" />);
    expect(c3.firstChild).toHaveClass('sm:max-w-dialog-lg');

    const { container: c4 } = render(<DialogShell size="xl" title="XL" />);
    expect(c4.firstChild).toHaveClass('sm:max-w-dialog-xl');
  });

  it('triggers onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <DialogShell title="Closable" onClose={handleClose}>
        <DialogBody>Body</DialogBody>
      </DialogShell>,
    );
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when swiping down on phone', () => {
    const handleClose = vi.fn();
    render(
      <DialogShell title="Swipe Test" onClose={handleClose}>
        <DialogBody>Body</DialogBody>
      </DialogShell>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');

    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 150, pointerId: 1 });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer with leftAction, secondaryAction and primaryAction props', () => {
    render(
      <DialogFooter
        leftAction={<button type="button" data-testid="delete-btn">Delete 9</button>}
        secondaryAction={<button type="button">Cancel</button>}
        primaryAction={<button type="button">Approve 9</button>}
      />
    );
    expect(screen.getByTestId('delete-btn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve 9' })).toBeInTheDocument();
  });
});

describe('Dialog (Radix overlay)', () => {
  it('opens and displays content on trigger click with z-overlay and z-scrim tokens', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button type="button">Open Modal</button>
        </DialogTrigger>
        <DialogContent title="Interactive Dialog">
          <DialogBody>Dialog is open</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText('Dialog is open')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Modal' }));

    const content = screen.getByText('Dialog is open').closest('[role="dialog"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('max-h-dvh');

    // Title and description should be rendered exactly once
    expect(screen.getAllByText('Interactive Dialog')).toHaveLength(1);
  });
});
