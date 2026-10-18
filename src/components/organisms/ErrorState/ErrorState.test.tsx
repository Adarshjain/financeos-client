import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorState } from './ErrorState';

function stubClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});

describe('ErrorState organism', () => {
  it('says what failed, with Try again then Copy reference', () => {
    render(
      <ErrorState
        title="Could not load transactions"
        description="The server answered with an error. Your data is safe; try again in a moment."
        action={{ label: 'Try again', onSelect: vi.fn() }}
        reference="f80e0834"
      />,
    );
    expect(screen.getByText('Could not load transactions')).toBeInTheDocument();
    expect(screen.getByText(/Your data is safe/)).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Try again',
      'Copy reference f80e0834',
    ]);
  });

  it('retries from its action', () => {
    const retry = vi.fn();
    render(<ErrorState title="Could not load" action={{ label: 'Try again', onSelect: retry }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('copies the reference to the clipboard, then calls onCopyReference', async () => {
    const writeText = stubClipboard();
    const onCopy = vi.fn();
    render(<ErrorState title="Could not load" reference="f80e0834" onCopyReference={onCopy} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy reference f80e0834' }));
    });
    expect(writeText).toHaveBeenCalledWith('f80e0834');
    expect(onCopy).toHaveBeenCalledWith('f80e0834');
  });

  it('still calls onCopyReference when the clipboard refuses', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    const onCopy = vi.fn();
    render(<ErrorState title="Could not load" reference="f80e0834" onCopyReference={onCopy} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy reference f80e0834' }));
    });
    expect(onCopy).toHaveBeenCalledWith('f80e0834');
  });

  it('still calls onCopyReference when there is no clipboard', async () => {
    const onCopy = vi.fn();
    render(<ErrorState title="Could not load" reference="f80e0834" onCopyReference={onCopy} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy reference f80e0834' }));
    });
    expect(onCopy).toHaveBeenCalledWith('f80e0834');
  });

  it('takes its own copy label', () => {
    render(<ErrorState title="Could not load" reference="ab12" copyLabel={(ref) => `Copy ${ref}`} />);
    expect(screen.getByRole('button', { name: 'Copy ab12' })).toBeInTheDocument();
  });

  it('shows only the buttons it has what for', () => {
    const { rerender, container } = render(<ErrorState title="Could not load" />);
    expect(container.querySelector('button')).toBeNull();

    rerender(<ErrorState title="Could not load" reference="f80e0834" />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Copy reference f80e0834']);

    rerender(<ErrorState title="Could not load" action={{ label: 'Try again', onSelect: vi.fn() }} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Try again']);
  });
});
