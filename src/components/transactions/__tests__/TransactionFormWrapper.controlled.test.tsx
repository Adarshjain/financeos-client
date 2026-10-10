import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

// The form itself is covered elsewhere; here only how it closes the dialog.
vi.mock('@/components/transactions/TransactionCRUD', () => ({
  default: ({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) => (
    <div>
      <button onClick={onSuccess}>save</button>
      <button onClick={onClose}>cancel</button>
    </div>
  ),
}));

import { TransactionFormWrapper } from '@/components/transactions/TransactionFormWrapper';

describe('TransactionFormWrapper controlled mode', () => {
  it('renders no trigger and shows the form when open', () => {
    render(<TransactionFormWrapper open onOpenChange={vi.fn()} />);
    expect(screen.getByText('New Transaction')).toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    render(<TransactionFormWrapper open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText('New Transaction')).not.toBeInTheDocument();
  });

  it('cancel asks the caller to close and leaves the open state to it', () => {
    const onOpenChange = vi.fn();
    render(<TransactionFormWrapper open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Still open: the caller has not closed it.
    expect(screen.getByText('New Transaction')).toBeInTheDocument();
  });

  it('a save closes through the caller and calls onSuccess', () => {
    const onSuccess = vi.fn();
    function Host() {
      const [open, setOpen] = useState(true);
      return <TransactionFormWrapper open={open} onOpenChange={setOpen} onSuccess={onSuccess} />;
    }
    render(<Host />);
    fireEvent.click(screen.getByText('save'));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('New Transaction')).not.toBeInTheDocument();
  });

  it('uncontrolled with a trigger also reports open changes', () => {
    const onOpenChange = vi.fn();
    render(<TransactionFormWrapper trigger={<button>Add</button>} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Add'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('New Transaction')).toBeInTheDocument();
    fireEvent.click(screen.getByText('cancel'));
    expect(screen.queryByText('New Transaction')).not.toBeInTheDocument();
  });
});
