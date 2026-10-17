import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';
import { describe, expect, it, vi } from 'vitest';

import { showToast, Toast, Toaster } from './Toast';

vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('sonner')>();
  return {
    ...actual,
    toast: {
      ...actual.toast,
      custom: vi.fn((jsx: any, opts: any) => actual.toast.custom(jsx, opts)),
      dismiss: vi.fn((id: any) => actual.toast.dismiss(id)),
    },
  };
});

describe('Toast', () => {
  it('renders message content', () => {
    render(<Toast message="Dashboard deleted" />);
    expect(screen.getByText('Dashboard deleted')).toBeInTheDocument();
  });

  it('applies dark ink background and shadow-level-2 for neutral tone default', () => {
    const { container } = render(<Toast message="Snoozed" />);
    expect(container.firstChild).toHaveClass(
      'bg-ink',
      'text-on-brand',
      'font-text',
      'shadow-level-2',
      'rounded-ds-lg',
    );
  });

  it('reuses Banner tone styles with shadow-level-2 for other tones', () => {
    const { container: cSuccess } = render(
      <Toast tone="success" message="Success" />,
    );
    expect(cSuccess.firstChild).toHaveClass(
      'bg-positive-tint',
      'text-positive-strong',
      'shadow-level-2',
    );

    const { container: cDanger } = render(
      <Toast tone="danger" message="Error" />,
    );
    expect(cDanger.firstChild).toHaveClass(
      'bg-danger-tint',
      'text-danger-ink',
      'shadow-level-2',
    );

    const { container: cWarning } = render(
      <Toast tone="warning" message="Warning" />,
    );
    expect(cWarning.firstChild).toHaveClass(
      'bg-warning-tint',
      'text-warning-ink',
      'shadow-level-2',
    );

    const { container: cInfo } = render(
      <Toast tone="info" message="Info" />,
    );
    expect(cInfo.firstChild).toHaveClass(
      'bg-info-tint',
      'text-info-ink',
      'shadow-level-2',
    );
  });

  it('renders action button and calls action.onSelect callback', () => {
    const handleAction = vi.fn();
    render(
      <Toast
        message="Snoozed until Wed 14 Oct"
        action={{ label: 'Undo', onSelect: handleAction }}
      />,
    );
    const undoBtn = screen.getByRole('button', { name: 'Undo' });
    expect(undoBtn).toBeInTheDocument();

    fireEvent.click(undoBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders status role by default and alert role when tone is danger', () => {
    const { rerender } = render(<Toast message="Success" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<Toast message="Couldn't snooze." tone="danger" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('wires action in showToast to invoke callback and dismiss the toast', () => {
    const handleAction = vi.fn();
    let renderCustomToast:
      | ((id: string | number) => React.ReactNode)
      | undefined;

    vi.mocked(sonnerToast.custom).mockImplementationOnce((fn, opts) => {
      renderCustomToast = fn as any;
      expect(opts?.duration).toBe(5000);
      expect(opts?.toasterId).toBe('ds');
      return 'toast-id-42';
    });

    showToast('Snoozed until Wed 14 Oct', {
      action: { label: 'Undo', onSelect: handleAction },
    });
    expect(sonnerToast.custom).toHaveBeenCalled();
    expect(renderCustomToast).toBeDefined();

    const { getByRole } = render(<>{renderCustomToast!('toast-id-42')}</>);
    const undoButton = getByRole('button', { name: 'Undo' });
    fireEvent.click(undoButton);

    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(sonnerToast.dismiss).toHaveBeenCalledWith('toast-id-42');
  });

  it('passes custom duration, id, onDismiss, tone and toasterId: ds to showToast', () => {
    let renderCustomToast:
      | ((id: string | number) => React.ReactNode)
      | undefined;
    const handleDismiss = vi.fn();

    vi.mocked(sonnerToast.custom).mockImplementationOnce((fn, opts) => {
      renderCustomToast = fn as any;
      expect(opts?.duration).toBe(3000);
      expect(opts?.id).toBe('custom-id-123');
      expect(opts?.toasterId).toBe('ds');
      expect(opts?.onDismiss).toBeDefined();
      opts?.onDismiss?.({} as any);
      return 'custom-id-123';
    });

    showToast("Couldn't snooze.", {
      id: 'custom-id-123',
      duration: 3000,
      tone: 'danger',
      onDismiss: handleDismiss,
      action: { label: 'Retry', onSelect: () => {} },
    });

    expect(sonnerToast.custom).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        id: 'custom-id-123',
        duration: 3000,
        toasterId: 'ds',
      }),
    );
    expect(handleDismiss).toHaveBeenCalledTimes(1);

    const { getByRole } = render(<>{renderCustomToast!('custom-id-123')}</>);
    expect(getByRole('alert')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders a showToast call inside the ds toaster and not in an untargeted root toaster', async () => {
    render(
      <>
        {/* Untargeted root toaster (e.g. from existing app layout) */}
        <div data-testid="root-toaster">
          <SonnerToaster />
        </div>
        {/* New system Toaster */}
        <div data-testid="ds-toaster">
          <Toaster />
        </div>
      </>,
    );

    const dsToaster = screen.getByTestId('ds-toaster');
    const rootToaster = screen.getByTestId('root-toaster');

    expect(dsToaster).toBeInTheDocument();
    expect(rootToaster).toBeInTheDocument();

    act(() => {
      showToast('New system toast rendered in ds');
    });

    // Toast message renders inside the ds Toaster
    expect(await within(dsToaster).findByText('New system toast rendered in ds')).toBeInTheDocument();
    // Toast message does NOT render in the root Toaster
    expect(within(rootToaster).queryByText('New system toast rendered in ds')).not.toBeInTheDocument();
  });
});
