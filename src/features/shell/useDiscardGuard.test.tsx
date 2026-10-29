import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDiscardGuard } from './useDiscardGuard';

function Harness(props: { dirty: boolean; onClose: () => void; busy?: boolean; what?: string }) {
  const guard = useDiscardGuard(props);
  return (
    <>
      <button onClick={guard.requestClose}>Cancel</button>
      {guard.node}
    </>
  );
}

describe('useDiscardGuard', () => {
  it('closes at once when nothing changed', () => {
    const onClose = vi.fn();
    render(<Harness dirty={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });

  it('asks first when there are changes; Keep editing stays, Discard closes', () => {
    const onClose = vi.fn();
    render(<Harness dirty onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Discard changes?')).toBeInTheDocument();
    expect(screen.getByText('This form has changes that are not saved.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('names the thing when `what` is given', () => {
    render(<Harness dirty onClose={vi.fn()} what="loan" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('This loan has changes that are not saved.')).toBeInTheDocument();
  });

  it('ignores requests while busy', () => {
    const onClose = vi.fn();
    render(<Harness dirty={false} busy onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });
});
