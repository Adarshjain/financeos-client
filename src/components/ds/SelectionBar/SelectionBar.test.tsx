import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SelectionBar, SelectionBarAction } from './SelectionBar';

describe('SelectionBar', () => {
  const defaultActions: SelectionBarAction[] = [
    { label: 'Link', onSelect: vi.fn() },
    { label: 'Merge', hint: 'the pair', onSelect: vi.fn() },
    { label: 'Approve', count: 2, onSelect: vi.fn() },
    { label: 'Delete', tone: 'danger', onSelect: vi.fn() },
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

  it('triggers action onSelect callback', () => {
    const handleLink = vi.fn();
    render(
      <SelectionBar
        count={2}
        actions={[{ label: 'Link', onSelect: handleLink }]}
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

    // Hint is present with desk:hidden
    const hint = screen.getByText('the pair');
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveClass('desk:hidden');

    const selectAllBtn = screen.getByRole('button', {
      name: 'Select all 182',
    });
    expect(selectAllBtn).toBeInTheDocument();
    expect(selectAllBtn).toHaveClass('h-control-md');

    // One floating pill at every width, as wide as its content
    // The root carries the layer, so the bar stays above sticky section headers.
    const root = container.firstElementChild;
    expect(root).toHaveClass('relative', 'z-floating');
    const bar = root?.firstElementChild;
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveClass('rounded-ds-lg', 'shadow-level-2', 'w-fit');

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

  it('action buttons have h-auto overriding default control height for phone layout', () => {
    render(
      <SelectionBar
        count={1}
        actions={[{ label: 'Link', onSelect: vi.fn() }]}
        onClear={() => {}}
      />,
    );
    const linkBtn = screen.getByRole('button', { name: 'Link' });
    expect(linkBtn).toHaveClass('h-auto');
    expect(linkBtn).toHaveClass('desk:h-control-md');
    const classList = Array.from(linkBtn.classList);
    expect(classList).not.toContain('h-control-md');
  });

  it('renders an action count inside the count bubble, not in the label', () => {
    render(
      <SelectionBar
        count={2}
        actions={[{ label: 'Approve', count: 2, onSelect: vi.fn() }]}
        onClear={() => {}}
      />,
    );
    const bubble = screen.getByRole('button', { name: 'Approve 2' }).querySelector('span.bg-ink');
    expect(bubble).toHaveTextContent('2');
    expect(screen.getByText('Approve')).not.toHaveTextContent('2');
  });

  it('omits the bubble when an action has no count', () => {
    render(
      <SelectionBar count={2} actions={[{ label: 'Link', onSelect: vi.fn() }]} onClear={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Link' }).querySelector('span.bg-ink')).toBeNull();
  });

  it('shows a disabled action hint on desktop markup', () => {
    render(
      <SelectionBar
        count={3}
        actions={[{ label: 'Merge', hint: 'needs exactly 2', disabled: true }]}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText('needs exactly 2')).not.toHaveClass('desk:hidden');
  });

  it('marks itself for the tab bar and shrinks to its content, centred', () => {
    const { container } = render(
      <SelectionBar count={2} actions={[{ id: 'a', label: 'Approve' }]} onClear={() => {}} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('data-selection-bar');
    const pill = root.firstElementChild as HTMLElement;
    expect(pill).toHaveClass('w-fit', 'mx-auto');
    expect(pill).not.toHaveClass('w-full');
  });
});
