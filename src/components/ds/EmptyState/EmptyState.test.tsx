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
});
