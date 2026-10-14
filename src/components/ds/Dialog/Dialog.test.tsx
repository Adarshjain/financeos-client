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

  it('applies correct maxWidth for sizes', () => {
    const { container: c1 } = render(<DialogShell size="sm" title="Small" />);
    expect(c1.firstChild).toHaveStyle({ maxWidth: '440px' });

    const { container: c2 } = render(<DialogShell size="md" title="Default" />);
    expect(c2.firstChild).toHaveStyle({ maxWidth: '640px' });

    const { container: c3 } = render(<DialogShell size="lg" title="Large" />);
    expect(c3.firstChild).toHaveStyle({ maxWidth: '760px' });

    const { container: c4 } = render(<DialogShell size="xl" title="XL" />);
    expect(c4.firstChild).toHaveStyle({ maxWidth: '920px' });
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

  it('renders footer with actions and leftAction', () => {
    render(
      <DialogFooter
        leftAction={<button type="button" data-testid="delete-btn">Delete</button>}
      >
        <button type="button">Cancel</button>
        <button type="button">Save</button>
      </DialogFooter>,
    );
    expect(screen.getByTestId('delete-btn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});

describe('Dialog (Radix overlay)', () => {
  it('opens and displays content on trigger click', () => {
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

    expect(screen.getByText('Dialog is open')).toBeInTheDocument();
  });
});
