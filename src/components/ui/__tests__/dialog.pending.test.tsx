import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';

function Footer({ pending }: { pending?: boolean }) {
  const onClick = vi.fn();
  return (
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>T</DialogTitle>
        <DialogFooter primaryAction={{ label: 'Save', onClick, pending }} secondaryAction={{ label: 'Cancel', onClick: () => {} }} />
      </DialogContent>
    </Dialog>
  );
}

describe('DialogFooter primaryAction.pending', () => {
  it('disables the primary button, marks it busy and shows a spinner before the label', () => {
    const { rerender } = render(<Footer pending />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(save.querySelector('svg.animate-spin')).not.toBeNull();
    fireEvent.click(save);

    rerender(<Footer />);
    const idle = screen.getByRole('button', { name: 'Save' });
    expect(idle).toBeEnabled();
    expect(idle).not.toHaveAttribute('aria-busy');
    expect(idle.querySelector('svg.animate-spin')).toBeNull();
  });
});
