import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No accounts yet"
        description="Add a bank or card, or upload a statement."
      />,
    );
    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
    expect(
      screen.getByText('Add a bank or card, or upload a statement.'),
    ).toBeInTheDocument();
  });

  it('renders illustration slot element', () => {
    render(
      <EmptyState
        illustration={<span data-testid="test-art">Illustration Art</span>}
        title="No items"
      />,
    );
    expect(screen.getByTestId('test-art')).toBeInTheDocument();
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders action button and triggers onSelect callback', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No accounts yet"
        action={{ label: 'Add account', onSelect: handleAction }}
      />,
    );
    const actionBtn = screen.getByRole('button', { name: 'Add account' });
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders compact single-line style with inline items', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        compact
        title="Due today:"
        description="None"
        action={{ label: 'Add', onSelect: handleAction }}
      >
        <span>(0 items)</span>
      </EmptyState>,
    );
    expect(screen.getByText('Due today:')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('(0 items)')).toBeInTheDocument();
    const actionBtn = screen.getByRole('button', { name: 'Add' });
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders a second action after the first as a secondary button', () => {
    const first = vi.fn();
    const second = vi.fn();
    render(
      <EmptyState
        title="Could not load transactions"
        action={{ label: 'Try again', onSelect: first }}
        secondaryAction={{ label: 'Copy reference f80e0834', onSelect: second }}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Try again', 'Copy reference f80e0834']);
    expect(buttons[0]).toHaveClass('bg-brand');
    expect(buttons[1]).toHaveClass('bg-surface', 'border-line-strong');

    fireEvent.click(buttons[1]);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('keeps both actions secondary when the first asks for it', () => {
    render(
      <EmptyState
        title="No transactions match"
        action={{ label: 'Clear amount', onSelect: vi.fn(), variant: 'secondary' }}
        secondaryAction={{ label: 'Clear all filters', onSelect: vi.fn() }}
      />,
    );
    for (const name of ['Clear amount', 'Clear all filters']) {
      expect(screen.getByRole('button', { name })).toHaveClass('bg-surface');
    }
  });

  it('renders a second action alone when there is no first', () => {
    const second = vi.fn();
    render(<EmptyState title="Empty" secondaryAction={{ label: 'Learn more', onSelect: second }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Learn more' }));
    expect(second).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('renders the second action as a link when compact', () => {
    const second = vi.fn();
    render(
      <EmptyState
        compact
        description="Nothing due on this day."
        action={{ label: 'Add', onSelect: vi.fn() }}
        secondaryAction={{ label: 'Open calendar', onSelect: second }}
      />,
    );
    const link = screen.getByRole('button', { name: 'Open calendar' });
    expect(link).toHaveClass('underline');
    fireEvent.click(link);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('renders no action row when there are no actions', () => {
    const { container } = render(<EmptyState title="All clear" description="Nothing needs you right now." />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('applies padding based on size prop', () => {
    const { container: smContainer } = render(
      <EmptyState size="sm" title="Small Empty" />,
    );
    expect(smContainer.firstChild).toHaveClass('px-space-16', 'py-space-20');

    const { container: mdContainer } = render(
      <EmptyState size="md" title="Default Empty" />,
    );
    expect(mdContainer.firstChild).toHaveClass('px-space-20', 'py-space-40');
  });

  it('merges custom className', () => {
    const { container } = render(
      <EmptyState title="Empty" className="custom-empty-class" />,
    );
    expect(container.firstChild).toHaveClass('custom-empty-class');
  });

  it('page-level shape: heading, one hint, one primary button', () => {
    render(<EmptyState title="No accounts yet" description="Add an account to start." action={{ label: 'Add account', onSelect: () => {} }} />);
    expect(screen.getByRole('heading', { name: 'No accounts yet' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Add account' })).toBeInTheDocument();
  });

  it('no-match shape: heading, one hint, a Clear filters button', () => {
    const clear = vi.fn();
    render(<EmptyState title="No matches" description="Try fewer filters." action={{ label: 'Clear filters', variant: 'secondary', onSelect: clear }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('secondary-card shape: compact is one muted line with no heading or button', () => {
    render(<EmptyState compact description="Nothing here yet." />);
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
