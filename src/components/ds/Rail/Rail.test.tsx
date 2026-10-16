import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Rail, type RailGroup, type RailItem } from './Rail';

const sampleGroups: RailGroup[] = [
  {
    items: [
      { id: 'home', label: 'Home', icon: 'home', href: '/' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox', count: 9, countTone: 'danger' },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'transactions', label: 'Transactions', icon: 'list-bullets', href: '/transactions', count: 25, countTone: 'warning' },
    ],
  },
];

const sampleFooter: RailItem[] = [
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
];

describe('Rail component', () => {
  it('renders brand row and nav items from groups prop', () => {
    render(<Rail current="/" groups={sampleGroups} />);
    expect(screen.getByText('FinanceOS')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Money')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('marks current nav item with brand-tint and brand-strong', () => {
    render(<Rail current="/transactions" groups={sampleGroups} />);
    const activeLink = screen.getByText('Transactions').closest('a');
    expect(activeLink).toHaveClass('bg-brand-tint');
    expect(activeLink).toHaveClass('text-brand-strong');
  });

  it('fires onNavigate when an item is clicked', () => {
    const handleNavigate = vi.fn();
    render(<Rail current="/" groups={sampleGroups} onNavigate={handleNavigate} />);
    const inboxLink = screen.getByText('Inbox').closest('a');
    fireEvent.click(inboxLink!);
    expect(handleNavigate).toHaveBeenCalledWith('/inbox');
  });

  it('fires onSelect when an item is clicked', () => {
    const handleSelect = vi.fn();
    render(<Rail current="/" groups={sampleGroups} onSelect={handleSelect} />);
    const inboxLink = screen.getByText('Inbox').closest('a');
    fireEvent.click(inboxLink!);
    expect(handleSelect).toHaveBeenCalledWith('inbox');
  });

  it('fires search callback when search button is clicked', () => {
    const handleSearch = vi.fn();
    render(<Rail search={handleSearch} />);
    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('renders count badges and warning numbers correctly', () => {
    render(<Rail current="/" groups={sampleGroups} />);
    expect(screen.getByText('9')).toBeInTheDocument();
    const warningCount = screen.getByText('25');
    expect(warningCount).toBeInTheDocument();
    expect(warningCount).toHaveClass('text-warning');
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

  it('renders footer items when provided', () => {
    render(
      <Rail
        current="/"
        footer={sampleFooter}
      />,
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
