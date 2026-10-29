import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../Button/Button';
import {
  ConfirmDialog,
  ConfirmDialogShell,
  Dialog,
  DialogShell,
} from './Dialog';

describe('DialogShell', () => {
  it('renders title, description and content', () => {
    render(
      <DialogShell
        title="Approve 9 transactions"
        description="Clears the reasons you tick."
      >
        <Dialog.Body>Modal body content</Dialog.Body>
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
    expect(c1.firstChild).toHaveClass('desk:max-w-container-sm');

    const { container: c2 } = render(<DialogShell size="md" title="Default" />);
    expect(c2.firstChild).toHaveClass('desk:max-w-container-md');

    const { container: c3 } = render(<DialogShell size="lg" title="Large" />);
    expect(c3.firstChild).toHaveClass('desk:max-w-container-lg');

    const { container: c4 } = render(<DialogShell size="xl" title="XL" />);
    expect(c4.firstChild).toHaveClass('desk:max-w-container-xl');
  });

  it('applies side-panel variant classes on desktop', () => {
    const { container } = render(
      <DialogShell variant="side-panel" title="Detail view" />,
    );
    expect(container.firstChild).toHaveClass('desk:rounded-ds-lg', 'desk:border', 'desk:border-line', 'desk:shadow-none');
    expect(container.firstChild).not.toHaveClass('desk:h-full');
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

  it('triggers onDismiss when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <DialogShell title="Closable" onDismiss={handleClose}>
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onDismiss when swiping down past threshold', () => {
    const handleClose = vi.fn();
    render(
      <DialogShell title="Swipe Test" onDismiss={handleClose}>
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');

    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 150, pointerId: 1 });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onDismiss when swiping down below threshold', () => {
    const handleClose = vi.fn();
    render(
      <DialogShell title="Swipe Short Test" onDismiss={handleClose}>
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');

    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 70, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 70, pointerId: 1 });

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders footer in order: tertiary, secondary, primary', () => {
    const { container } = render(
      <DialogShell
        title="Footer test"
        tertiary={{ label: 'Delete 9' }}
        secondary={{ label: 'Cancel' }}
        primary={{ label: 'Approve 9' }}
      >
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    const grid = container.querySelector('.grid.grid-flow-col')!;
    const buttons = Array.from(grid.querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Delete 9',
      'Cancel',
      'Approve 9',
    ]);
  });

  it('draws a footer action icon before its label, only on the actions that set one', () => {
    const { container } = render(
      <DialogShell
        title="Export"
        secondary={{ label: 'Cancel' }}
        primary={{ label: 'Download CSV', icon: 'download' }}
      >
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    const buttons = Array.from(container.querySelectorAll('.grid.grid-flow-col button'));
    expect(buttons[0].querySelector('svg')).toBeNull();
    const svg = buttons[1].querySelector('svg')!;
    expect(svg).not.toBeNull();
    expect(buttons[1].textContent).toBe('Download CSV');
    expect(buttons[1].firstElementChild!.contains(svg)).toBe(true);
  });

  it('draws primary as primary or danger-filled, and secondary/tertiary as ghost', () => {
    const { rerender } = render(
      <DialogShell
        title="Variants test"
        tertiary={{ label: 'Tertiary' }}
        secondary={{ label: 'Secondary' }}
        primary={{ label: 'Primary' }}
      >
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveClass('bg-brand');
    for (const name of ['Secondary', 'Tertiary']) {
      const b = screen.getByRole('button', { name });
      expect(b).toHaveClass('bg-transparent', 'h-control-md');
      expect(b).not.toHaveClass('underline');
    }

    rerender(
      <DialogShell
        title="Variants test"
        primary={{ label: 'Delete', tone: 'danger' }}
      >
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger');
  });

  it('draws secondary and tertiary with tone danger as ghost in the danger colour; a plain primary stays brand', () => {
    render(
      <DialogShell
        title="Tone test"
        tertiary={{ label: 'Delete entry', tone: 'danger' }}
        secondary={{ label: 'Remove', tone: 'danger' }}
        primary={{ label: 'Save' }}
      >
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    expect(screen.getByRole('button', { name: 'Delete entry' })).toHaveClass('bg-transparent', 'text-danger', 'h-control-md');
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveClass('bg-transparent', 'text-danger', 'h-control-md');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('bg-brand');
  });

  it('fires onSelect for each action', () => {
    const onTertiary = vi.fn();
    const onSecondary = vi.fn();
    const onPrimary = vi.fn();

    render(
      <DialogShell
        title="Callbacks test"
        tertiary={{ label: 'Delete', onSelect: onTertiary }}
        secondary={{ label: 'Cancel', onSelect: onSecondary }}
        primary={{ label: 'Save', onSelect: onPrimary }}
      >
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onTertiary).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSecondary).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it('supports type="submit" and form attribute to submit external form', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault());
    render(
      <div>
        <form id="edit-form" onSubmit={handleSubmit}>
          <input name="test" defaultValue="123" />
        </form>
        <DialogShell
          title="Submit test"
          primary={{ label: 'Submit form', type: 'submit', form: 'edit-form' }}
        >
          <Dialog.Body>Body</Dialog.Body>
        </DialogShell>
      </div>,
    );
    const submitBtn = screen.getByRole('button', { name: 'Submit form' });
    expect(submitBtn).toHaveAttribute('type', 'submit');
    expect(submitBtn).toHaveAttribute('form', 'edit-form');
    fireEvent.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('passes loading and disabled props through to footer buttons', () => {
    render(
      <DialogShell
        title="State test"
        primary={{ label: 'Saving', loading: true, disabled: true }}
        secondary={{ label: 'Cancel', disabled: true }}
      >
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    const primaryBtn = screen.getByRole('button', { name: 'Saving' });
    const secondaryBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(primaryBtn).toBeDisabled();
    expect(primaryBtn.querySelector('svg')).toBeInTheDocument();
    expect(secondaryBtn).toBeDisabled();
  });

  it('renders exactly two columns when only primary and secondary are present', () => {
    const { container } = render(
      <DialogShell
        title="Two actions test"
        secondary={{ label: 'Cancel' }}
        primary={{ label: 'Confirm' }}
      >
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    const grid = container.querySelector('.grid.grid-flow-col')!;
    expect(grid.children).toHaveLength(2);
  });

  it('hides drag handle when dismissible={false}', () => {
    const { container } = render(
      <DialogShell title="Non dismissible" dismissible={false}>
        <Dialog.Body>Body</Dialog.Body>
      </DialogShell>,
    );
    expect(container.querySelector('.bg-line-heavy')).toBeNull();
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
        previewLoading
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

  it('supports tone="default" mapping to primary button', () => {
    render(
      <ConfirmDialogShell
        title="Save draft"
        confirmLabel="Save"
        tone="default"
      />,
    );
    const confirmBtn = screen.getByRole('button', { name: 'Save' });
    expect(confirmBtn).toHaveClass('bg-brand');
  });

  it('maps tone="danger" to destructive danger-filled button', () => {
    render(
      <ConfirmDialogShell
        title="Delete rule"
        confirmLabel="Delete"
        tone="danger"
      />,
    );
    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    expect(confirmBtn).toHaveClass('bg-danger');
  });

  it('forwards ref on ConfirmDialog', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ConfirmDialog
        ref={ref}
        defaultOpen
        title="Ref test"
        confirmLabel="Confirm"
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
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
        <Dialog.Trigger asChild>
          <Button>Open Modal</Button>
        </Dialog.Trigger>
        <Dialog.Content title="Interactive Dialog">
          <Dialog.Body>Dialog is open</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );

    expect(screen.queryByText('Dialog is open')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Modal' }));

    const content = screen.getByText('Dialog is open').closest('[role="dialog"] > div');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('max-h-dvh-safe');
    expect(screen.getAllByText('Interactive Dialog')).toHaveLength(1);
  });

  it('sets Dialog.Content background to bg-canvas when background="canvas"', () => {
    render(
      <Dialog open>
        <Dialog.Content background="canvas" title="Canvas Dialog">
          <Dialog.Body>Canvas body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );

    const content = screen.getByText('Canvas body').closest('[role="dialog"] > div');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('bg-canvas');
    expect(content).not.toHaveClass('bg-surface');
  });

  it('does not render padded header wrapper when only srTitle is passed without visible header', () => {
    const { container } = render(
      <Dialog open>
        <Dialog.Content srTitle="Screen reader title" showClose={false}>
          <Dialog.Body>No header body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );

    expect(screen.getByRole('heading', { name: 'Screen reader title' })).toHaveClass('sr-only');
    expect(container.querySelector('.pt-space-12')).toBeNull();
  });

  it('renders portalled panel with font-text class', () => {
    render(
      <Dialog open>
        <Dialog.Content title="Font test">
          <Dialog.Body>Font body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );

    const content = screen.getByText('Font body').closest('[role="dialog"] > div');
    expect(content).toHaveClass('font-text');
  });

  it('renders DialogShell with font-text class', () => {
    const { container } = render(<DialogShell title="Shell font test" />);
    expect(container.firstChild).toHaveClass('font-text');
  });

  it('close button triggers Radix close path and calls onDismiss', () => {
    const handleClose = vi.fn();
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <Dialog.Content title="Close Test" onDismiss={handleClose}>
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    const headerCloseBtn = closeButtons.find(
      (btn) => !btn.classList.contains('sr-only'),
    )!;
    fireEvent.click(headerCloseBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders dialog drag area with touch-none for swipe handling', () => {
    render(
      <Dialog open>
        <Dialog.Content title="Drag Test">
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');
    expect(dragArea).toHaveClass('touch-none');
  });

  it('swipe-down past threshold closes Dialog.Content and calls onOpenChange(false) without onDismiss', () => {
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <Dialog.Content title="Swipe Close Test">
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');

    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 150, pointerId: 1 });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('swipe-down past threshold closes Dialog.Content and calls both onDismiss and onOpenChange(false)', () => {
    const handleClose = vi.fn();
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <Dialog.Content title="Swipe Close With Handler" onDismiss={handleClose}>
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');

    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 150, pointerId: 1 });

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('pointercancel mid-drag does not close Dialog.Content and resets transform', () => {
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <Dialog.Content title="Cancel Drag Test">
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');
    const panel = dragArea.closest('[role="dialog"] > div') as HTMLElement;

    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 150, pointerId: 1 });

    expect(panel.style.transform).toBe('translateY(100px)');

    fireEvent.pointerCancel(dragArea, { pointerId: 1 });

    expect(handleOpenChange).not.toHaveBeenCalled();
    expect(panel.style.transform).toBe('');
  });
});

describe('Dialog close button (UAT)', () => {
  it('does not capture the pointer when the press starts on the × button', () => {
    const capture = vi.fn();
    const original = HTMLElement.prototype.setPointerCapture;
    HTMLElement.prototype.setPointerCapture = capture;
    render(
      <Dialog open>
        <Dialog.Content title="Close press">
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const x = screen
      .getAllByRole('button', { name: 'Close' })
      .find((b) => !b.classList.contains('sr-only'))!;
    fireEvent.pointerDown(x, { pointerId: 1, clientY: 10 });
    expect(capture).not.toHaveBeenCalled();
    // A press on the drag handle area still starts a drag.
    fireEvent.pointerDown(screen.getByTestId('dialog-drag-area'), { pointerId: 2, clientY: 10 });
    expect(capture).toHaveBeenCalledTimes(1);
    HTMLElement.prototype.setPointerCapture = original;
  });

  it('clicking × calls onOpenChange(false) when controlled', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <Dialog.Content title="Controlled">
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const x = screen
      .getAllByRole('button', { name: 'Close' })
      .find((b) => !b.classList.contains('sr-only'))!;
    fireEvent.pointerDown(x, { pointerId: 1 });
    fireEvent.pointerUp(x, { pointerId: 1 });
    fireEvent.click(x);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clicking × closes an uncontrolled dialog', () => {
    render(
      <Dialog defaultOpen>
        <Dialog.Content title="Uncontrolled">
          <Dialog.Body>Body text</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const x = screen
      .getAllByRole('button', { name: 'Close' })
      .find((b) => !b.classList.contains('sr-only'))!;
    fireEvent.pointerDown(x, { pointerId: 1 });
    fireEvent.click(x);
    expect(screen.queryByText('Body text')).not.toBeInTheDocument();
  });

  it('draws the phone footer at the standard control height', () => {
    render(
      <DialogShell
        title="Footer"
        primary={{ label: 'Save' }}
        secondary={{ label: 'Cancel' }}
      />,
    );
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toHaveClass('h-control-md');
    expect(save).not.toHaveClass('h-control-xl');
    expect(save.parentElement?.parentElement).toHaveClass('pb-safe-12');
  });
});

describe('Dialog side panel (non-modal on desktop)', () => {
  const settle = () => new Promise((r) => setTimeout(r, 20));

  const renderPanel = (variant: 'modal' | 'side-panel', onOpenChange = vi.fn()) => {
    render(
      <div>
        <button type="button">Row behind</button>
        <Dialog open variant={variant} onOpenChange={onOpenChange}>
          <Dialog.Content title="Detail">
            <Dialog.Body>Body</Dialog.Body>
          </Dialog.Content>
        </Dialog>
      </div>,
    );
    return onOpenChange;
  };

  it('draws a backdrop that is hidden on desktop and no Radix overlay', async () => {
    renderPanel('side-panel');
    const backdrop = screen.getByTestId('dialog-backdrop');
    expect(backdrop).toHaveClass('desk:hidden');
  });

  it('an outside pointer-down does not close it', async () => {
    const onOpenChange = renderPanel('side-panel');
    await settle();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Row behind' }));
    fireEvent.click(screen.getByRole('button', { name: 'Row behind' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('Escape closes it', () => {
    const onOpenChange = renderPanel('side-panel');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('the x button closes it', () => {
    const onOpenChange = renderPanel('side-panel');
    const x = screen
      .getAllByRole('button', { name: 'Close' })
      .find((b) => !b.classList.contains('sr-only'))!;
    fireEvent.click(x);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('a backdrop click closes it', () => {
    const onOpenChange = renderPanel('side-panel');
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('the modal variant keeps its overlay and closes on an outside click', async () => {
    const onOpenChange = renderPanel('modal');
    expect(screen.queryByTestId('dialog-backdrop')).toBeNull();
    await settle();
    fireEvent.pointerDown(document.body);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('side-panel placement', () => {
  const place = (className?: string, size?: 'sm' | 'md') => {
    render(
      <Dialog open variant="side-panel">
        <Dialog.Content title="Detail" className={className} size={size}>
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    return screen.getByRole('dialog');
  };

  it('defaults to a card inset by the gutter on all sides', () => {
    expect(place()).toHaveClass('desk:top-space-24', 'desk:right-space-24', 'desk:bottom-space-24');
  });

  it("puts the page's top offset on the positioned element, replacing the default top", () => {
    const el = place('desk:top-space-56 desk:mt-space-24');
    expect(el).toHaveClass('desk:top-space-56', 'desk:mt-space-24', 'desk:bottom-space-24');
    expect(el).not.toHaveClass('desk:top-space-24');
  });

  it('takes the width of its size, not the width of its content', () => {
    expect(place(undefined, 'sm')).toHaveClass('desk:w-full', 'desk:max-w-container-sm');
  });
});

describe('nested dialogs', () => {
  it('gives every dialog its own backdrop on the same layer as its panel, in portal order', () => {
    render(
      <Dialog open variant="side-panel">
        <Dialog.Content title="Detail">
          <Dialog.Body>Lower body</Dialog.Body>
          <Dialog open>
            <Dialog.Content title="Confirm delete">
              <Dialog.Body>Upper body</Dialog.Body>
            </Dialog.Content>
          </Dialog>
        </Dialog.Content>
      </Dialog>,
    );
    const lowerBackdrop = screen.getByTestId('dialog-backdrop');
    const dialogs = screen.getAllByRole('dialog', { hidden: true });
    expect(dialogs).toHaveLength(2);
    // One overlay for the upper (modal) dialog, besides the lower sheet's backdrop.
    const overlays = Array.from(document.body.querySelectorAll('.z-overlay.bg-backdrop'));
    expect(overlays).toHaveLength(2);
    expect(overlays.every((el) => !el.classList.contains('z-backdrop'))).toBe(true);
    dialogs.forEach((d) => expect(d).toHaveClass('z-overlay'));
    // Later in the DOM means above on the shared layer: the upper backdrop follows the lower panel.
    const upperBackdrop = overlays.find((el) => el !== lowerBackdrop) as HTMLElement;
    expect(dialogs[0].compareDocumentPosition(upperBackdrop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(upperBackdrop.compareDocumentPosition(dialogs[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('a single dialog keeps its backdrop below its own panel', () => {
    render(
      <Dialog open>
        <Dialog.Content title="Only">
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const overlay = document.body.querySelector('.bg-backdrop') as HTMLElement;
    expect(overlay).toHaveClass('z-overlay');
    expect(overlay.compareDocumentPosition(screen.getByRole('dialog')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('Dialog size full', () => {
  it('fills the viewport with no radius, sheet handle or breakpoint-only close', () => {
    render(
      <Dialog defaultOpen>
        <Dialog.Content size="full" title="Card utilisation" onDismiss={vi.fn()}>
          <Dialog.Body>Widget body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const panel = screen.getByText('Widget body').closest('div.pointer-events-auto');
    expect(panel).toHaveClass('w-dvw', 'h-dvh', 'rounded-none', 'border-0');
    expect(panel).not.toHaveClass('rounded-t-ds-2xl');
    expect(screen.queryByTestId('dialog-drag-area')?.querySelector('.cursor-grab')).toBeNull();
    const close = screen.getAllByRole('button', { name: 'Close' }).find((b) => !b.classList.contains('sr-only'));
    expect(close).toHaveClass('inline-flex');
    expect(close).not.toHaveClass('hidden');
  });

  it('the close button closes it', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog defaultOpen onOpenChange={onOpenChange}>
        <Dialog.Content size="full" title="Card utilisation">
          <Dialog.Body>Widget body</Dialog.Body>
        </Dialog.Content>
      </Dialog>,
    );
    const close = screen.getAllByRole('button', { name: 'Close' }).find((b) => !b.classList.contains('sr-only'))!;
    fireEvent.click(close);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shell has no handle at full size', () => {
    const { container } = render(<DialogShell size="full" title="Full" />);
    expect(container.firstChild).toHaveClass('w-dvw', 'h-dvh');
    expect(container.querySelector('.cursor-grab')).toBeNull();
  });
});

describe('Dialog.Bleed', () => {
  it('cancels the body side padding at both widths and renders its children', () => {
    render(<Dialog.Bleed data-testid="bleed"><span>Band</span></Dialog.Bleed>);
    expect(screen.getByTestId('bleed')).toHaveClass('-mx-space-16', 'desk:-mx-space-20');
    expect(screen.getByText('Band')).toBeInTheDocument();
  });
});
