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
        variant="desktop"
        count={2}
        summary="₹2,498 · the duplicate pair"
        actions={defaultActions}
        onClear={() => {}}
      />,
    );

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(
      screen.getByText('₹2,498 · the duplicate pair'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('triggers action click callback', () => {
    const handleLink = vi.fn();
    render(
      <SelectionBar
        variant="desktop"
        count={2}
        actions={[{ label: 'Link', onClick: handleLink }]}
        onClear={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    expect(handleLink).toHaveBeenCalledTimes(1);
  });

  it('disables actions marked disabled', () => {
    render(
      <SelectionBar
        variant="desktop"
        count={3}
        actions={[{ label: 'Merge', disabled: true }]}
        onClear={() => {}}
      />,
    );

    const mergeBtn = screen.getByRole('button', { name: 'Merge' });
    expect(mergeBtn).toBeDisabled();
  });

  it('triggers onClear when clicking close button', () => {
    const handleClear = vi.fn();
    render(
      <SelectionBar
        variant="desktop"
        count={2}
        actions={defaultActions}
        onClear={handleClear}
      />,
    );

    const clearBtn = screen.getByRole('button', { name: 'Clear selection' });
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('triggers onClear when Escape key is pressed', () => {
    const handleClear = vi.fn();
    render(
      <SelectionBar
        variant="desktop"
        count={2}
        actions={defaultActions}
        onClear={handleClear}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders phone variant with select all and hints', () => {
    const handleSelectAll = vi.fn();
    render(
      <SelectionBar
        variant="phone"
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
    fireEvent.click(selectAllBtn);
    expect(handleSelectAll).toHaveBeenCalledTimes(1);
  });

  it('returns null when count is 0', () => {
    const { container } = render(
      <SelectionBar
        variant="desktop"
        count={0}
        actions={defaultActions}
        onClear={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
