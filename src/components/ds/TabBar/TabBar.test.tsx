import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { formatBadgeCount, TabBar } from './TabBar';

describe('formatBadgeCount', () => {
  it('formats counts properly', () => {
    expect(formatBadgeCount(undefined)).toBeNull();
    expect(formatBadgeCount(0)).toBeNull();
    expect(formatBadgeCount(-5)).toBeNull();
    expect(formatBadgeCount(4)).toBe('4');
    expect(formatBadgeCount(99)).toBe('99');
    expect(formatBadgeCount(100)).toBe('99+');
    expect(formatBadgeCount(999)).toBe('99+');
  });
});

describe('TabBar', () => {
  it('renders 5 tabs in canonical order', () => {
    render(<TabBar activeTab="home" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs[0]).toHaveTextContent('Home');
    expect(tabs[1]).toHaveTextContent('Inbox');
    expect(tabs[2]).toHaveTextContent('Upcoming');
    expect(tabs[3]).toHaveTextContent('Transactions');
    expect(tabs[4]).toHaveTextContent('More');
  });

  it('marks active tab with aria-selected="true"', () => {
    render(<TabBar activeTab="transactions" />);

    const transactionsTab = screen.getByRole('tab', { name: /Transactions/i });
    expect(transactionsTab).toHaveAttribute('aria-selected', 'true');

    const homeTab = screen.getByRole('tab', { name: /Home/i });
    expect(homeTab).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabChange when a tab is clicked', () => {
    const handleTabChange = vi.fn();
    render(<TabBar activeTab="home" onTabChange={handleTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /Upcoming/i }));
    expect(handleTabChange).toHaveBeenCalledWith('upcoming');

    fireEvent.click(screen.getByRole('tab', { name: /More/i }));
    expect(handleTabChange).toHaveBeenCalledWith('more');
  });

  it('renders count badges on Inbox and Transactions positioned without covering glyphs', () => {
    render(
      <TabBar
        activeTab="home"
        inboxCount={9}
        transactionsCount={25}
      />,
    );

    const inboxBadge = screen.getByText('9');
    expect(inboxBadge).toBeInTheDocument();
    expect(inboxBadge).toHaveClass('left-space-14');
    expect(inboxBadge).toHaveClass('h-space-16');
    expect(inboxBadge).toHaveClass('min-w-space-16');

    const txBadge = screen.getByText('25');
    expect(txBadge).toBeInTheDocument();
    expect(txBadge).toHaveClass('left-space-14');
  });

  it('renders 99+ when count exceeds 99', () => {
    render(
      <TabBar
        activeTab="home"
        inboxCount={150}
      />,
    );

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('returns null when hidden is true', () => {
    const { container } = render(<TabBar activeTab="home" hidden />);
    expect(container.firstChild).toBeNull();
  });
});
