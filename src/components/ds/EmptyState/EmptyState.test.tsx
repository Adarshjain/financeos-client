import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

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

  it('renders illustration or offline variant', () => {
    render(<EmptyState variant="offline" />);
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
    render(<EmptyState compact>Nothing due on this day.</EmptyState>);
    expect(screen.getByText('Nothing due on this day.')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(
      <EmptyState title="Empty" className="custom-empty-class" />,
    );
    expect(container.firstChild).toHaveClass('custom-empty-class');
  });
});
