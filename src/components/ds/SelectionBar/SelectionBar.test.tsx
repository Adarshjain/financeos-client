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

  it('renders count and summary once in DOM', () => {
    render(
      <SelectionBar
        count={2}
        summary="₹2,498 · the duplicate pair"
        actions={defaultActions}
        onClear={() => {}}
      />,
    );

    expect(screen.getAllByText('2 selected')).toHaveLength(1);
    expect(screen.getAllByText('₹2,498 · the duplicate pair')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Link' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Merge' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Approve 2' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Clear selection' })).toHaveLength(1);
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

    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
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

    const mergeBtn = screen.getByRole('button', { name: 'Merge' });
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

    const clearBtn = screen.getByRole('button', { name: 'Clear selection' });
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

  it('renders select all and hints with responsive switch classes', () => {
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

    // Each action label appears exactly once
    defaultActions.forEach((act) => {
      const labelRegex = new RegExp(`^${act.label}`);
      expect(screen.getAllByText(labelRegex)).toHaveLength(1);
    });

    // Hint is present with lg:hidden
    const hint = screen.getByText('the pair');
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveClass('lg:hidden');

    const selectAllBtn = screen.getByRole('button', {
      name: 'Select all 182',
    });
    expect(selectAllBtn).toBeInTheDocument();
    expect(selectAllBtn).toHaveClass('h-control-md');

    // Bar switches between docked bottom sheet (< lg) and floating pill (>= lg)
    const bar = container.querySelector('.z-dock');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveClass('rounded-t-ds-sheet', 'lg:rounded-ds-lg', 'shadow-dock', 'lg:shadow-pop', 'w-full', 'lg:w-fit');

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
