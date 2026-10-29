import { act, fireEvent, render, screen } from '@testing-library/react';
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

  it('is fully solid: plain surface, no glass background or blur', () => {
    const { container } = render(<SelectionBar count={1} actions={defaultActions} onClear={() => {}} />);
    const panel = container.querySelector('[data-selection-bar] > div');
    expect(panel).toHaveClass('bg-surface');
    expect(panel?.className).not.toMatch(/glass/);
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

  it('renders an action with an href as a link and still calls onSelect', () => {
    const onSelect = vi.fn();
    render(
      <SelectionBar
        count={2}
        actions={[
          { label: 'Open', href: '/open', onSelect },
          { label: 'Back', variant: 'link', href: '/back' },
        ]}
        onClear={() => {}}
      />,
    );
    const open = screen.getByRole('link', { name: 'Open' });
    expect(open).toHaveAttribute('href', '/open');
    fireEvent.click(open);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/back');
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

    // Bar switches between docked bottom sheet (< desk) and floating pill (>= desk)
    // The root carries the layer, so the bar stays above sticky section headers.
    const root = container.firstElementChild;
    expect(root).toHaveClass('relative', 'z-floating');
    const bar = root?.firstElementChild;
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveClass('rounded-t-ds-2xl', 'desk:rounded-ds-lg', 'shadow-up-1', 'desk:shadow-level-2', 'w-full', 'desk:w-fit');

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

  it('marks itself for the tab bar; docked full width on phone, pill centred on desktop', () => {
    const { container } = render(
      <SelectionBar count={2} actions={[{ id: 'a', label: 'Approve' }]} onClear={() => {}} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('data-selection-bar');
    const pill = root.firstElementChild as HTMLElement;
    expect(pill).toHaveClass('w-full', 'desk:w-fit', 'desk:mx-auto');
  });

  describe('motion', () => {
    const el = (c: HTMLElement) => c.querySelector('[data-selection-bar]') as HTMLElement | null;
    const bar = (count: number) => (
      <SelectionBar count={count} actions={defaultActions} onClear={() => {}} />
    );

    it('enters open when count is above 0', () => {
      const { container } = render(bar(2));
      expect(el(container)?.getAttribute('data-state')).toBe('open');
    });

    it('stays mounted while exiting, then unmounts on animationend', () => {
      const { container, rerender } = render(bar(2));
      rerender(bar(0));
      const node = el(container);
      expect(node).not.toBeNull();
      expect(node?.getAttribute('data-state')).toBe('closed');
      expect(screen.getByText('2 selected')).toBeTruthy();
      act(() => {
        // jsdom lacks AnimationEvent; React may listen on the prefixed name, so send both.
        for (const type of ['animationend', 'webkitAnimationEnd']) {
          node!.dispatchEvent(new Event(type, { bubbles: true }));
        }
      });
      expect(el(container)).toBeNull();
    });

    it('unmounts after the fallback timeout when no animationend fires', () => {
      vi.useFakeTimers();
      const { container, rerender } = render(bar(2));
      rerender(bar(0));
      expect(el(container)).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(el(container)).toBeNull();
      vi.useRealTimers();
    });

    it('re-entry cancels the exit', () => {
      const { container, rerender } = render(bar(2));
      rerender(bar(0));
      rerender(bar(3));
      expect(el(container)?.getAttribute('data-state')).toBe('open');
      expect(screen.getByText('3 selected')).toBeTruthy();
      fireEvent.animationEnd(el(container)!);
      expect(el(container)).not.toBeNull();
    });

    it('renders nothing when mounted with count 0', () => {
      const { container } = render(bar(0));
      expect(el(container)).toBeNull();
    });
  });

  describe('page actions (no count)', () => {
    it('has no count text and no clear button without onClear', () => {
      render(<SelectionBar actions={[{ label: 'Save report', variant: 'primary' }]} />);
      expect(screen.queryByText(/selected/)).toBeNull();
      expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Save report' })).toBeInTheDocument();
    });

    it('draws the clear button when onClear is given and Esc does not call it', () => {
      const onClear = vi.fn();
      render(<SelectionBar actions={[{ label: 'Save', variant: 'primary' }]} onClear={onClear} />);
      fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
      expect(onClear).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('renders the summary node as the leading slot', () => {
      render(
        <SelectionBar
          summary={<><span>Unsaved changes</span><button type="button">More</button></>}
          actions={[{ label: 'Cancel', variant: 'link' }]}
        />,
      );
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
    });

    it('runs variant actions and disables a loading one', () => {
      const onCancel = vi.fn();
      const onSave = vi.fn();
      const { rerender } = render(
        <SelectionBar
          actions={[
            { label: 'Cancel', variant: 'link', onSelect: onCancel },
            { label: 'Save report', variant: 'primary', onSelect: onSave },
          ]}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledTimes(1);

      rerender(
        <SelectionBar
          actions={[
            { label: 'Cancel', variant: 'link', onSelect: onCancel },
            { label: 'Saving report', variant: 'primary', loading: true, onSelect: onSave },
          ]}
        />,
      );
      const saving = screen.getByRole('button', { name: /Saving report/ });
      expect(saving).toBeDisabled();
      fireEvent.click(saving);
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });
});
