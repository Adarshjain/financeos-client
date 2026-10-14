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

  it('applies brandground, on-brand text, and shadow-pop tokens', () => {
    const { container } = render(<Toast message="Snoozed" />);
    expect(container.firstChild).toHaveClass(
      'bg-brand',
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

  it('calls sonner custom toast via showToast', () => {
    showToast('Marked ₹20,000 paid');
    expect(sonnerToast.custom).toHaveBeenCalled();
  });
});
