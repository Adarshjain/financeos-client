import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AddLendingProvider, useAddLending } from './AddLendingProvider';

vi.mock('./AddLendingDialog', () => ({
  AddLendingDialog: ({ onClose }: { onClose: () => void }) => (
    <div>
      <p>lending dialog</p>
      <button onClick={onClose}>close lending</button>
    </div>
  ),
}));

function Opener() {
  const { open } = useAddLending();
  return <button onClick={() => void open()}>open lending</button>;
}

describe('AddLendingProvider', () => {
  it('opens the dialog from state wherever the page asks, and closes it again', async () => {
    render(
      <AddLendingProvider>
        <Opener />
      </AddLendingProvider>,
    );
    expect(screen.queryByText('lending dialog')).toBeNull();
    fireEvent.click(screen.getByText('open lending'));
    expect(await screen.findByText('lending dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close lending'));
    expect(screen.queryByText('lending dialog')).toBeNull();
  });

  it('does nothing without a provider', () => {
    render(<Opener />);
    fireEvent.click(screen.getByText('open lending'));
    expect(screen.queryByText('lending dialog')).toBeNull();
  });
});
