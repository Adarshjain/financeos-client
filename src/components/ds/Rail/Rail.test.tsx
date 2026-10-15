import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { defaultRailGroups, Rail } from './Rail';

describe('Rail component', () => {
  it('renders brand row and default nav items', () => {
    render(<Rail current="/" />);
    expect(screen.getByText('FinanceOS')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('marks current nav item with brand-tint and brand-strong', () => {
    render(<Rail current="/transactions" />);
    const activeLink = screen.getByText('Transactions').closest('a');
    expect(activeLink).toHaveClass('bg-brand-tint');
    expect(activeLink).toHaveClass('text-brand-strong');
  });

  it('fires onNavigate when an item is clicked', () => {
    const handleNavigate = vi.fn();
    render(<Rail current="/" onNavigate={handleNavigate} />);
    const inboxLink = screen.getByText('Inbox').closest('a');
    fireEvent.click(inboxLink!);
    expect(handleNavigate).toHaveBeenCalledWith('/inbox');
  });

  it('fires onSearch when search button is clicked', () => {
    const handleSearch = vi.fn();
    render(<Rail onSearch={handleSearch} />);
    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('renders count badges correctly', () => {
    render(<Rail current="/" items={defaultRailGroups} />);
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders user initials in bottom profile section', () => {
    render(
      <Rail
        current="/"
        user={{ name: 'Arjun Mehta', initials: 'AM' }}
      />,
    );
    expect(screen.getByText('AM')).toBeInTheDocument();
  });
});
