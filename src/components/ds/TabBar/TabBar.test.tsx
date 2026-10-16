import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TabBar, type TabBarItem } from './TabBar';

const sampleItems: TabBarItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', count: 4, countTone: 'danger' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar' },
  { id: 'transactions', label: 'Transactions', icon: 'list-bullets', count: 25, countTone: 'warning' },
  { id: 'more', label: 'More', icon: 'more' },
];

describe('TabBar', () => {
  it('renders up to 5 items in order as buttons by default', () => {
    render(<TabBar items={sampleItems} current="home" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs[0]).toHaveTextContent('Home');
    expect(tabs[0].tagName).toBe('BUTTON');
    expect(tabs[1]).toHaveTextContent('Inbox');
    expect(tabs[1].tagName).toBe('BUTTON');
    expect(tabs[2]).toHaveTextContent('Upcoming');
    expect(tabs[3]).toHaveTextContent('Transactions');
    expect(tabs[4]).toHaveTextContent('More');
  });

  it('limits visible items to at most 5', () => {
    const sixItems: TabBarItem[] = [
      ...sampleItems,
      { id: 'extra', label: 'Extra', icon: 'settings' },
    ];
    render(<TabBar items={sixItems} current="home" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(screen.queryByText('Extra')).not.toBeInTheDocument();
  });

  it('marks active tab with aria-selected="true" and aria-current="page"', () => {
    render(<TabBar items={sampleItems} current="transactions" />);

    const transactionsTab = screen.getByRole('tab', { name: /Transactions/i });
    expect(transactionsTab).toHaveAttribute('aria-selected', 'true');
    expect(transactionsTab).toHaveAttribute('aria-current', 'page');

    const homeTab = screen.getByRole('tab', { name: /Home/i });
    expect(homeTab).toHaveAttribute('aria-selected', 'false');
    expect(homeTab).not.toHaveAttribute('aria-current');
  });

  it('calls onSelect when a tab is clicked', () => {
    const handleSelect = vi.fn();
    render(<TabBar items={sampleItems} current="home" onSelect={handleSelect} />);

    fireEvent.click(screen.getByRole('tab', { name: /Upcoming/i }));
    expect(handleSelect).toHaveBeenCalledWith('upcoming');

    fireEvent.click(screen.getByRole('tab', { name: /More/i }));
    expect(handleSelect).toHaveBeenCalledWith('more');
  });

  it('renders an item with asChild as the provided child element and calls onSelect', () => {
    const handleSelect = vi.fn();
    render(
      <TabBar
        items={[
          {
            id: 'home',
            label: 'Home',
            icon: 'home',
            asChild: true,
            children: <a href="/dashboard" data-testid="custom-link" />,
          },
        ]}
        onSelect={handleSelect}
      />,
    );

    const tab = screen.getByTestId('custom-link');
    expect(tab.tagName).toBe('A');
    expect(tab).toHaveAttribute('href', '/dashboard');
    expect(tab).toHaveAttribute('role', 'tab');
    expect(tab).toHaveTextContent('Home');

    fireEvent.click(tab);
    expect(handleSelect).toHaveBeenCalledWith('home');
  });

  it('renders count badges on items with counts', () => {
    render(<TabBar items={sampleItems} current="home" />);

    const inboxBadge = screen.getByText('4');
    expect(inboxBadge).toBeInTheDocument();

    const txBadge = screen.getByText('25');
    expect(txBadge).toBeInTheDocument();
  });

  it('renders 99+ when count exceeds 99 via formatCount', () => {
    const highCountItems: TabBarItem[] = [
      { id: 'inbox', label: 'Inbox', icon: 'inbox', count: 150, countTone: 'danger' },
    ];
    render(<TabBar items={highCountItems} current="inbox" />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('renders floating pill container with Phase 1 classes and lg:hidden', () => {
    render(<TabBar items={sampleItems} current="home" />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });

    expect(nav).toHaveClass(
      'fixed',
      'inset-x-space-12',
      'bottom-safe-12',
      'z-floating',
      'bg-surface',
      'border',
      'border-line',
      'rounded-ds-pill',
      'shadow-up-1',
      'py-space-8',
      'px-space-4',
      'lg:hidden',
    );
  });

  it('styles active item with text-ink and font-extrabold label, inactive with text-ink-faint', () => {
    render(<TabBar items={sampleItems} current="home" />);
    const homeTab = screen.getByRole('tab', { name: /Home/i });
    const inboxTab = screen.getByRole('tab', { name: /Inbox/i });

    expect(homeTab).toHaveClass('text-ink');
    expect(homeTab).not.toHaveClass('bg-hover', 'bg-pressed', 'border-t', 'border-b');
    expect(screen.getByText('Home')).toHaveClass('font-extrabold');

    expect(inboxTab).toHaveClass('text-ink-faint');
    expect(screen.getByText('Inbox')).not.toHaveClass('font-extrabold');
  });

  it('renders count badge with ring-2 ring-surface pinned to top-right', () => {
    render(<TabBar items={sampleItems} current="home" />);
    const badge = screen.getByText('4');

    expect(badge).toHaveClass(
      'absolute',
      '-top-space-4',
      'left-space-12',
      'ring-2',
      'ring-surface',
    );
  });
});
