import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { EmptyState, OfflineIllustration } from './EmptyState';

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

  it('renders illustration', () => {
    render(
      <EmptyState
        illustration={<OfflineIllustration />}
        title="You're offline"
      />,
    );
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText('₹')).toBeInTheDocument();
    expect(screen.getByText('z z')).toBeInTheDocument();
  });

  it('renders action elements', () => {
    render(
      <EmptyState
        title="No accounts yet"
        action={<button type="button">Add account</button>}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Add account' }),
    ).toBeInTheDocument();
  });

  it('renders compact single-line style', () => {
    const { container } = render(
      <EmptyState compact>Nothing due on this day.</EmptyState>,
    );
    expect(screen.getByText('Nothing due on this day.')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('p-space-16', 'text-body', 'text-ink-3');
  });
});
