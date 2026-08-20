import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

describe('Dialog Primitive', () => {
  it('renders footer buttons in secondary-then-primary DOM order and single action full-width', () => {
    const { rerender } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogBody>Content</DialogBody>
          <DialogFooter
            primaryAction={{ label: 'Save', onClick: () => {} }}
            secondaryAction={{ label: 'Cancel', onClick: () => {} }}
          />
        </DialogContent>
      </Dialog>,
    );

    const buttons = screen.getAllByRole('button');
    // Button index 0 is close button ('X')
    const footerButtons = buttons.filter((b) => b.getAttribute('data-slot') !== 'dialog-close-btn' && b.textContent !== 'Close');
    expect(footerButtons[0]).toHaveTextContent('Cancel');
    expect(footerButtons[1]).toHaveTextContent('Save');

    // Single action
    rerender(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogBody>Content</DialogBody>
          <DialogFooter primaryAction={{ label: 'OK', onClick: () => {} }} />
        </DialogContent>
      </Dialog>,
    );

    const singleFooterBtn = screen.getByRole('button', { name: 'OK' });
    expect(singleFooterBtn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('disables both buttons during promise-returning primaryAction.onClick and re-enables on rejection', async () => {
    let rejectPromise!: (err: Error) => void;

    const asyncAction = vi.fn().mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectPromise = reject;
        }),
    );

    const secondaryOnClick = vi.fn();

    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogBody>Body</DialogBody>
          <DialogFooter
            primaryAction={{ label: 'Submit', onClick: asyncAction }}
            secondaryAction={{ label: 'Cancel', onClick: secondaryOnClick }}
          />
        </DialogContent>
      </Dialog>,
    );

    const primaryBtn = screen.getByRole('button', { name: 'Submit' });
    const secondaryBtn = screen.getByRole('button', { name: 'Cancel' });

    expect(primaryBtn).not.toBeDisabled();
    expect(secondaryBtn).not.toBeDisabled();

    fireEvent.click(primaryBtn);

    expect(asyncAction).toHaveBeenCalledTimes(1);
    expect(primaryBtn).toBeDisabled();
    expect(secondaryBtn).toBeDisabled();

    // Secondary click while running should be prevented by disabled state
    fireEvent.click(secondaryBtn);
    expect(secondaryOnClick).not.toHaveBeenCalled();

    // Rejection handling
    const testErr = new Error('Failed operation');
    rejectPromise(testErr);

    await waitFor(() => {
      expect(primaryBtn).not.toBeDisabled();
      expect(secondaryBtn).not.toBeDisabled();
    });
  });

  it('secondary action without onClick closes the dialog', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogBody>Body</DialogBody>
          <DialogFooter
            primaryAction={{ label: 'Confirm' }}
            secondaryAction={{ label: 'Cancel' }}
          />
        </DialogContent>
      </Dialog>,
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('submits a form inside DialogBody when type="submit" and form ID are set on primaryAction', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());

    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Form Dialog</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="test-form" onSubmit={onSubmit}>
              <input name="testInput" defaultValue="hello" />
            </form>
          </DialogBody>
          <DialogFooter
            primaryAction={{ label: 'Save', type: 'submit', form: 'test-form' }}
            secondaryAction={{ label: 'Cancel' }}
          />
        </DialogContent>
      </Dialog>,
    );

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    expect(saveBtn).toHaveAttribute('type', 'submit');
    expect(saveBtn).toHaveAttribute('form', 'test-form');

    fireEvent.click(saveBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders srTitle as sr-only title and hides close button when showCloseButton is false', () => {
    render(
      <Dialog open>
        <DialogContent srTitle="Accessible Title" showCloseButton={false}>
          <DialogBody>Body</DialogBody>
          <DialogFooter primaryAction={{ label: 'OK' }} />
        </DialogContent>
      </Dialog>,
    );

    const srTitle = screen.getByText('Accessible Title');
    expect(srTitle).toHaveClass('sr-only');
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});
