import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../Button/Button';
import {
  ConfirmDialog,
  ConfirmDialogShell,
  Dialog,
  DialogBody,
  DialogContent,
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
    expect(c1.firstChild).toHaveClass('lg:max-w-dialog-sm');

    const { container: c2 } = render(<DialogShell size="md" title="Default" />);
    expect(c2.firstChild).toHaveClass('lg:max-w-dialog-md');

    const { container: c3 } = render(<DialogShell size="lg" title="Large" />);
    expect(c3.firstChild).toHaveClass('lg:max-w-dialog-lg');

    const { container: c4 } = render(<DialogShell size="xl" title="XL" />);
    expect(c4.firstChild).toHaveClass('lg:max-w-dialog-xl');
  });

  it('applies side-panel variant classes on desktop', () => {
    const { container } = render(
      <DialogShell variant="side-panel" title="Detail view" />,
    );
    expect(container.firstChild).toHaveClass('lg:rounded-l-ds-xl');
    expect(container.firstChild).toHaveClass('lg:h-full');
  });

  it('applies bg-canvas when background="canvas" and bg-surface when background="surface" (default)', () => {
    const { container: defaultContainer } = render(
      <DialogShell title="Default surface" />,
    );
    expect(defaultContainer.firstChild).toHaveClass('bg-surface');
    expect(defaultContainer.firstChild).not.toHaveClass('bg-canvas');

    const { container: canvasContainer } = render(
      <DialogShell title="Canvas" background="canvas" />,
    );
    expect(canvasContainer.firstChild).toHaveClass('bg-canvas');
    expect(canvasContainer.firstChild).not.toHaveClass('bg-surface');
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

  it('triggers onClose when swiping down past threshold', () => {
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

  it('does not trigger onClose when swiping down below threshold', () => {
    const handleClose = vi.fn();
    render(
      <DialogShell title="Swipe Short Test" onClose={handleClose}>
        <DialogBody>Body</DialogBody>
      </DialogShell>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');

    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 70, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 70, pointerId: 1 });

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders footer with tertiary, secondary and primary on desktop', () => {
    render(
      <DialogShell
        title="Footer test"
        tertiary={<Button variant="danger">Delete 9</Button>}
        secondary={<Button variant="secondary">Cancel</Button>}
        primary={<Button variant="primary">Approve 9</Button>}
      >
        <DialogBody>Body</DialogBody>
      </DialogShell>,
    );
    expect(screen.getByRole('button', { name: 'Delete 9' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve 9' })).toBeInTheDocument();
  });

  it('renders unified footer with tertiary far left, secondary and primary on right', () => {
    render(
      <DialogShell
        title="Phone tertiary test"
        tertiary={<Button variant="danger">Delete rule</Button>}
        secondary={<Button variant="secondary">Cancel</Button>}
        primary={<Button variant="primary">Save</Button>}
      >
        <DialogBody>Form content</DialogBody>
      </DialogShell>,
    );
    // Tertiary action is rendered inside footer alongside secondary and primary
    expect(screen.getByRole('button', { name: 'Delete rule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('renders title, description and impact items', () => {
    render(
      <ConfirmDialogShell
        title="Delete statement"
        description="Removes statement"
        impact={[
          '6 transactions will be deleted.',
          '2 email alerts go back to review.',
        ]}
        confirmLabel="Delete statement"
        cancelLabel="Cancel"
      />,
    );
    expect(screen.getByText('Delete statement', { selector: '.font-extrabold' })).toBeInTheDocument();
    expect(screen.getByText('Removes statement')).toBeInTheDocument();
    expect(screen.getByText('6 transactions will be deleted.')).toBeInTheDocument();
    expect(screen.getByText('2 email alerts go back to review.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete statement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders checking impact state and disables confirm button', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmDialogShell
        title="Delete statement"
        isCheckingImpact
        checkingMessage="Checking affected rows…"
        onConfirm={handleConfirm}
        confirmLabel="Delete statement"
      />,
    );
    expect(screen.getByText('Checking affected rows…')).toBeInTheDocument();
    const deleteBtn = screen.getByRole('button', { name: 'Delete statement' });
    expect(deleteBtn).toBeDisabled();
    fireEvent.click(deleteBtn);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('renders alternative label and triggers callbacks', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();
    const handleAlternative = vi.fn();

    render(
      <ConfirmDialogShell
        title="Discard changes"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        alternativeLabel="Close instead"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onAlternative={handleAlternative}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close instead' }));
    expect(handleAlternative).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders accessible modal when trigger is clicked', () => {
    render(
      <ConfirmDialog
        title="Delete transaction?"
        confirmLabel="Delete"
        trigger={<Button>Delete transaction</Button>}
      />,
    );

    expect(screen.queryByText('Delete transaction?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete transaction' }));
    expect(screen.getByText('Delete transaction?')).toBeInTheDocument();
  });
});

describe('Dialog (Radix overlay)', () => {
  it('opens and displays content on trigger click', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Modal</Button>
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
    expect(screen.getAllByText('Interactive Dialog')).toHaveLength(1);
  });

  it('sets DialogContent background to bg-canvas when background="canvas"', () => {
    render(
      <Dialog open>
        <DialogContent background="canvas" title="Canvas Dialog">
          <DialogBody>Canvas body</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByText('Canvas body').closest('[role="dialog"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('bg-canvas');
    expect(content).not.toHaveClass('bg-surface');
  });
});
