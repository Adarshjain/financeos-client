import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';

describe('ConfirmationDialog (controlled mode)', () => {
  it('opens from the open prop without rendering a trigger', () => {
    render(<ConfirmationDialog title="Sure?" open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sure?' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).not.toContain('Open');
  });

  it('stays closed while open is false', () => {
    render(<ConfirmationDialog title="Sure?" open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reports Cancel through onOpenChange(false) and runs secondaryAction', () => {
    const onOpenChange = vi.fn();
    const secondaryAction = vi.fn();
    render(
      <ConfirmationDialog
        title="Sure?"
        open
        onOpenChange={onOpenChange}
        secondaryAction={secondaryAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(secondaryAction).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reports a successful primary action through onOpenChange(false)', async () => {
    const onOpenChange = vi.fn();
    const primaryAction = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmationDialog
        title="Sure?"
        open
        onOpenChange={onOpenChange}
        primaryAction={primaryAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(primaryAction).toHaveBeenCalledTimes(1);
  });

  it('ignores an Escape dismiss while loading', () => {
    const onOpenChange = vi.fn();
    render(<ConfirmationDialog title="Sure?" open onOpenChange={onOpenChange} loading />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('still works uncontrolled with a trigger', async () => {
    render(
      <ConfirmationDialog
        title="Sure?"
        trigger={<button type="button">Open</button>}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
