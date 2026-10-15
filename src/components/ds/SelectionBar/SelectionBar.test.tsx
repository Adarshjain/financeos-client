import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SelectionBar, SelectionBarAction } from './SelectionBar';

describe('SelectionBar', () => {
  const defaultActions: SelectionBarAction[] = [
    { label: 'Link', onClick: vi.fn() },
    { label: 'Merge', hint: 'the pair', onClick: vi.fn() },
    { label: 'Approve', count: 2, onClick: vi.fn() },
    { label: 'Delete', variant: 'danger', onClick: vi.fn() },
  ];

  it('renders count and summary', () => {
    render(
      <SelectionBar
        count={2}
        summary="₹2,498 · the duplicate pair"
        actions={defaultActions}
        onClear={() => {}}
      />,
    );

    expect(screen.getAllByText('2 selected').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('₹2,498 · the duplicate pair').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Link' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Merge' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Approve 2' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete' })[0]).toBeInTheDocument();
  });

  it('triggers action click callback', () => {
    const handleLink = vi.fn();
    render(
      <SelectionBar
        count={2}
        actions={[{ label: 'Link', onClick: handleLink }]}
        onClear={() => {}}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Link' })[0]);
    expect(handleLink).toHaveBeenCalledTimes(1);
  });

  it('disables actions marked disabled', () => {
    render(
      <SelectionBar
        count={3}
        actions={[{ label: 'Merge', disabled: true }]}
        onClear={() => {}}
      />,
    );

    const mergeBtn = screen.getAllByRole('button', { name: 'Merge' })[0];
    expect(mergeBtn).toBeDisabled();
  });

  it('triggers onClear when clicking close button', () => {
    const handleClear = vi.fn();
    render(
      <SelectionBar
        count={2}
        actions={defaultActions}
        onClear={handleClear}
      />,
    );

    const clearBtn = screen.getAllByRole('button', { name: 'Clear selection' })[0];
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('triggers onClear when Escape key is pressed', () => {
    const handleClear = vi.fn();
    render(
      <SelectionBar
        count={2}
        actions={defaultActions}
        onClear={handleClear}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders select all and hints in mobile docked layout', () => {
    const handleSelectAll = vi.fn();
    const { container } = render(
      <SelectionBar
        count={2}
        actions={defaultActions}
        onClear={() => {}}
        onSelectAll={handleSelectAll}
        selectAllLabel="Select all 182"
      />,
    );

    expect(screen.getByText('the pair')).toBeInTheDocument();
    const selectAllBtn = screen.getByRole('button', {
      name: 'Select all 182',
    });
    expect(selectAllBtn).toBeInTheDocument();
    expect(selectAllBtn).toHaveClass('h-control-md');
    expect(container.querySelector('.z-dock')).toBeInTheDocument();
    fireEvent.click(selectAllBtn);
    expect(handleSelectAll).toHaveBeenCalledTimes(1);
  });

  it('returns null and does not fire onClear on Escape when count is 0', () => {
    const handleClear = vi.fn();
    const { container } = render(
      <SelectionBar
        count={0}
        actions={defaultActions}
        onClear={handleClear}
      />,
    );
    expect(container.firstChild).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClear).not.toHaveBeenCalled();
  });
});
