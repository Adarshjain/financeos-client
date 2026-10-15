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

  it('applies dark ink background and shadow-pop for neutral tone default', () => {
    const { container } = render(<Toast message="Snoozed" />);
    expect(container.firstChild).toHaveClass(
      'bg-ink',
      'text-on-brand',
      'shadow-pop',
      'rounded-ds-lg',
    );
  });

  it('reuses Banner tone styles with shadow-pop for other tones', () => {
    const { container: cSuccess } = render(
      <Toast tone="success" message="Success" />,
    );
    expect(cSuccess.firstChild).toHaveClass(
      'bg-positive-tint',
      'text-positive-strong',
      'shadow-pop',
    );

    const { container: cDanger } = render(
      <Toast tone="danger" message="Error" />,
    );
    expect(cDanger.firstChild).toHaveClass(
      'bg-danger-tint',
      'text-danger-ink',
      'shadow-pop',
    );

    const { container: cWarning } = render(
      <Toast tone="warning" message="Warning" />,
    );
    expect(cWarning.firstChild).toHaveClass(
      'bg-warning-tint',
      'text-warning-ink',
      'shadow-pop',
    );

    const { container: cInfo } = render(
      <Toast tone="info" message="Info" />,
    );
    expect(cInfo.firstChild).toHaveClass(
      'bg-info-tint',
      'text-info-ink',
      'shadow-pop',
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

  it('renders status role by default and alert role when tone is danger', () => {
    const { rerender } = render(<Toast message="Success" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<Toast message="Couldn't snooze." tone="danger" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('wires onUndo in showToast to invoke callback and dismiss the toast', () => {
    const handleUndo = vi.fn();
    let renderCustomToast:
      | ((id: string | number) => React.ReactNode)
      | undefined;

    vi.mocked(sonnerToast.custom).mockImplementationOnce((fn, opts) => {
      renderCustomToast = fn as any;
      expect(opts?.duration).toBe(5000);
      return 'toast-id-42';
    });

    showToast('Snoozed until Wed 14 Oct', { onUndo: handleUndo });
    expect(sonnerToast.custom).toHaveBeenCalled();
    expect(renderCustomToast).toBeDefined();

    const { getByRole } = render(<>{renderCustomToast!('toast-id-42')}</>);
    const undoButton = getByRole('button', { name: 'Undo' });
    fireEvent.click(undoButton);

    expect(handleUndo).toHaveBeenCalledTimes(1);
    expect(sonnerToast.dismiss).toHaveBeenCalledWith('toast-id-42');
  });

  it('passes custom duration, undoLabel and tone to showToast', () => {
    let renderCustomToast:
      | ((id: string | number) => React.ReactNode)
      | undefined;

    vi.mocked(sonnerToast.custom).mockImplementationOnce((fn, opts) => {
      renderCustomToast = fn as any;
      expect(opts?.duration).toBe(3000);
      return 'toast-id-custom';
    });

    showToast("Couldn't snooze.", {
      duration: 3000,
      tone: 'danger',
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
