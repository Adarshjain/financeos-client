import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';

import { showToast, Toast } from './Toast';

vi.mock('sonner', () => ({
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('Toast', () => {
  it('renders message content', () => {
    render(<Toast message="Dashboard deleted" />);
    expect(screen.getByText('Dashboard deleted')).toBeInTheDocument();
  });

  it('applies ink background, on-brand text, and shadow-pop tokens', () => {
    const { container } = render(<Toast message="Snoozed" />);
    expect(container.firstChild).toHaveClass(
      'bg-ink',
      'text-on-brand',
      'shadow-pop',
      'rounded-ds-lg',
    );
  });

  it('renders undo button and calls onUndo callback', () => {
    const handleUndo = vi.fn();
    render(
      <Toast
        message="Snoozed until Wed 14 Oct"
        onUndo={handleUndo}
        undoLabel="Undo"
      />,
    );
    const undoBtn = screen.getByRole('button', { name: 'Undo' });
    expect(undoBtn).toBeInTheDocument();

    fireEvent.click(undoBtn);
    expect(handleUndo).toHaveBeenCalledTimes(1);
  });

  it('renders status role by default and alert role when isError is true', () => {
    const { rerender } = render(<Toast message="Success" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<Toast message="Couldn't snooze." isError />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('wires onUndo in showToast to invoke callback and dismiss the toast', () => {
    const handleUndo = vi.fn();
    let renderCustomToast: ((id: string | number) => React.ReactNode) | undefined;

    vi.mocked(sonnerToast.custom).mockImplementationOnce((fn, opts) => {
      renderCustomToast = fn as any;
      expect(opts?.duration).toBe(5000);
      return 'toast-id-42';
    });

    showToast('Snoozed until Wed 14 Oct', { onUndo: handleUndo });
    expect(sonnerToast.custom).toHaveBeenCalled();
    expect(renderCustomToast).toBeDefined();

    // Render the element created by the showToast renderer
    const { getByRole } = render(<>{renderCustomToast!('toast-id-42')}</>);
    const undoButton = getByRole('button', { name: 'Undo' });
    fireEvent.click(undoButton);

    expect(handleUndo).toHaveBeenCalledTimes(1);
    expect(sonnerToast.dismiss).toHaveBeenCalledWith('toast-id-42');
  });

  it('passes custom duration, undoLabel and isError to showToast', () => {
    let renderCustomToast: ((id: string | number) => React.ReactNode) | undefined;

    vi.mocked(sonnerToast.custom).mockImplementationOnce((fn, opts) => {
      renderCustomToast = fn as any;
      expect(opts?.duration).toBe(3000);
      return 'toast-id-custom';
    });

    showToast("Couldn't snooze.", {
      duration: 3000,
      isError: true,
      onUndo: () => {},
      undoLabel: 'Retry',
    });

    expect(sonnerToast.custom).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ duration: 3000 }),
    );

    const { getByRole } = render(<>{renderCustomToast!('toast-id-custom')}</>);
    expect(getByRole('alert')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
