import { act, fireEvent, render, screen } from '@testing-library/react';
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

  it('renders footer in order: tertiary, secondary, primary', () => {
    const { container } = render(
      <DialogShell
        title="Footer test"
        tertiary={{ label: 'Delete 9' }}
        secondary={{ label: 'Cancel' }}
        primary={{ label: 'Approve 9' }}
      >
        <DialogBody>Body</DialogBody>
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

  it('draws primary as primary or danger-filled, and secondary/tertiary as link', () => {
    const { rerender } = render(
      <DialogShell
        title="Variants test"
        tertiary={{ label: 'Tertiary' }}
        secondary={{ label: 'Secondary' }}
        primary={{ label: 'Primary' }}
      >
        <DialogBody>Body</DialogBody>
      </DialogShell>,
    );
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveClass('bg-brand');
    expect(screen.getByRole('button', { name: 'Secondary' })).toHaveClass('underline');
    expect(screen.getByRole('button', { name: 'Tertiary' })).toHaveClass('underline');

    rerender(
      <DialogShell
        title="Variants test"
        primary={{ label: 'Delete', destructive: true }}
      >
        <DialogBody>Body</DialogBody>
      </DialogShell>,
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger');
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
        <DialogBody>Body</DialogBody>
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
          <DialogBody>Body</DialogBody>
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
        <DialogBody>Body</DialogBody>
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
        <DialogBody>Body</DialogBody>
      </DialogShell>,
    );
    const grid = container.querySelector('.grid.grid-flow-col')!;
    expect(grid.children).toHaveLength(2);
  });

  it('hides drag handle when dismissible={false}', () => {
    const { container } = render(
      <DialogShell title="Non dismissible" dismissible={false}>
        <DialogBody>Body</DialogBody>
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

    const content = screen.getByText('Dialog is open').closest('[role="dialog"] > div');
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

    const content = screen.getByText('Canvas body').closest('[role="dialog"] > div');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('bg-canvas');
    expect(content).not.toHaveClass('bg-surface');
  });

  it('does not render padded header wrapper when only srTitle is passed without visible header', () => {
    const { container } = render(
      <Dialog open>
        <DialogContent srTitle="Screen reader title" showClose={false}>
          <DialogBody>No header body</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole('heading', { name: 'Screen reader title' })).toHaveClass('sr-only');
    expect(container.querySelector('.pt-space-12')).toBeNull();
  });

  it('renders portalled panel with font-text class', () => {
    render(
      <Dialog open>
        <DialogContent title="Font test">
          <DialogBody>Font body</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByText('Font body').closest('[role="dialog"] > div');
    expect(content).toHaveClass('font-text');
  });

  it('renders DialogShell with font-text class', () => {
    const { container } = render(<DialogShell title="Shell font test" />);
    expect(container.firstChild).toHaveClass('font-text');
  });

  it('close button triggers Radix close path and calls onClose', () => {
    const handleClose = vi.fn();
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent title="Close Test" onClose={handleClose}>
          <DialogBody>Body</DialogBody>
        </DialogContent>
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
        <DialogContent title="Drag Test">
          <DialogBody>Body</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');
    expect(dragArea).toHaveClass('touch-none');
  });

  it('swipe-down past threshold closes DialogContent and calls onOpenChange(false) without onClose', () => {
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent title="Swipe Close Test">
          <DialogBody>Body</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');

    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 150, pointerId: 1 });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('swipe-down past threshold closes DialogContent and calls both onClose and onOpenChange(false)', () => {
    const handleClose = vi.fn();
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent title="Swipe Close With Handler" onClose={handleClose}>
          <DialogBody>Body</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const dragArea = screen.getByTestId('dialog-drag-area');

    fireEvent.pointerDown(dragArea, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(dragArea, { clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(dragArea, { clientY: 150, pointerId: 1 });

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('pointercancel mid-drag does not close DialogContent and resets transform', () => {
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent title="Cancel Drag Test">
          <DialogBody>Body</DialogBody>
        </DialogContent>
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
        <DialogContent title="Close press">
          <DialogBody>Body</DialogBody>
        </DialogContent>
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
        <DialogContent title="Controlled">
          <DialogBody>Body</DialogBody>
        </DialogContent>
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
        <DialogContent title="Uncontrolled">
          <DialogBody>Body text</DialogBody>
        </DialogContent>
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
          <DialogContent title="Detail">
            <DialogBody>Body</DialogBody>
          </DialogContent>
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
        <DialogContent title="Detail" className={className} size={size}>
          <DialogBody>Body</DialogBody>
        </DialogContent>
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
        <DialogContent title="Detail">
          <DialogBody>Lower body</DialogBody>
          <Dialog open>
            <DialogContent title="Confirm delete">
              <DialogBody>Upper body</DialogBody>
            </DialogContent>
          </Dialog>
        </DialogContent>
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
        <DialogContent title="Only">
          <DialogBody>Body</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const overlay = document.body.querySelector('.bg-backdrop') as HTMLElement;
    expect(overlay).toHaveClass('z-overlay');
    expect(overlay.compareDocumentPosition(screen.getByRole('dialog')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('footer while typing on phone', () => {
  const setup = () => {
    render(
      <DialogShell title="Edit" primary={{ label: 'Save' }}>
        <DialogBody>
          <input aria-label="Name" />
          <input aria-label="Tick" type="checkbox" />
          <textarea aria-label="Note" />
        </DialogBody>
      </DialogShell>,
    );
    return screen.getByRole('button', { name: 'Save' }).closest('.border-t') as HTMLElement;
  };

  it('hides the footer on phone while a text input has focus and shows it again on blur', () => {
    const footer = setup();
    expect(footer).not.toHaveClass('max-desk:hidden');
    fireEvent.focusIn(screen.getByLabelText('Name'));
    expect(footer).toHaveClass('max-desk:hidden');
    fireEvent.focusOut(screen.getByLabelText('Name'), { relatedTarget: document.body });
    expect(footer).not.toHaveClass('max-desk:hidden');
  });

  it('treats a textarea as text entry', () => {
    const footer = setup();
    fireEvent.focusIn(screen.getByLabelText('Note'));
    expect(footer).toHaveClass('max-desk:hidden');
  });

  it('keeps the footer for a checkbox', () => {
    const footer = setup();
    fireEvent.focusIn(screen.getByLabelText('Tick'));
    expect(footer).not.toHaveClass('max-desk:hidden');
  });

  it('keeps it hidden when focus moves from one text field to another', () => {
    const footer = setup();
    fireEvent.focusIn(screen.getByLabelText('Name'));
    fireEvent.focusOut(screen.getByLabelText('Name'), { relatedTarget: screen.getByLabelText('Note') });
    expect(footer).toHaveClass('max-desk:hidden');
  });

  it('shows the footer again when the focused field is removed without a blur', () => {
    vi.useFakeTimers();
    try {
      const footer = setup();
      const input = screen.getByLabelText('Name') as HTMLInputElement;
      input.focus();
      fireEvent.focusIn(input);
      expect(footer).toHaveClass('max-desk:hidden');
      input.disabled = true;
      input.blur();
      act(() => {
        fireEvent.pointerDown(document.body);
        vi.runAllTimers();
      });
      expect(footer).not.toHaveClass('max-desk:hidden');
    } finally {
      vi.useRealTimers();
    }
  });

  it('settles after a focusout with no related target', () => {
    vi.useFakeTimers();
    try {
      const footer = setup();
      const input = screen.getByLabelText('Name');
      input.focus();
      fireEvent.focusIn(input);
      input.blur();
      fireEvent.focusOut(input, { relatedTarget: null });
      act(() => {
        vi.runAllTimers();
      });
      expect(footer).not.toHaveClass('max-desk:hidden');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the footer again when the keyboard closes (visual viewport grows) with focus kept', () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: 400,
      addEventListener: (t: string, fn: () => void) => { listeners[t] = fn; },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('visualViewport', vv);
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    try {
      const footer = setup();
      const input = screen.getByLabelText('Name');
      input.focus();
      fireEvent.focusIn(input);
      expect(footer).toHaveClass('max-desk:hidden');
      vv.height = 800;
      act(() => listeners.resize());
      expect(footer).not.toHaveClass('max-desk:hidden');
    } finally {
      vi.unstubAllGlobals();
      Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
    }
  });
});
