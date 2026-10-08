import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockPath = '/dashboard';
let mockSummary: { badge: number } | undefined;
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: mockSummary }) }));

import { NavTree } from '../NavTree';

beforeEach(() => {
  mockPath = '/dashboard';
  mockSummary = undefined;
});

describe('NavTree structure', () => {
  it('shows top-level links and every group header', () => {
    render(<NavTree />);
    for (const name of ['Home', 'Inbox', 'Upcoming', 'Accounts', 'Settings']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    for (const group of ['Transactions', 'Investments & Portfolio', 'Loans & Lendings', 'Rewards', 'Insights']) {
      expect(screen.getByRole('button', { name: group })).toBeInTheDocument();
    }
  });

  it('keeps groups collapsed on a neutral route and expands on click', () => {
    render(<NavTree />);
    expect(screen.queryByRole('link', { name: 'Import' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute('href', '/transactions/import');
    fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(screen.queryByRole('link', { name: 'Import' })).not.toBeInTheDocument();
  });

  it.each([
    ['/transactions/import', 'Import'],
    ['/rules', 'Rules'],
    ['/categories', 'Rules'],
    ['/rewards', 'Earning rules'],
    ['/reports', 'Reports'],
    ['/dashboards', 'Reports'],
    ['/chat', 'Reports'],
    ['/investments', 'Tradebook'],
    ['/loans', 'Lendings'],
  ])('opens the owning group on %s', (path, child) => {
    mockPath = path;
    render(<NavTree />);
    expect(screen.getByRole('link', { name: child })).toBeInTheDocument();
  });

  it('lists Chat with Data inside Insights, not as a top-level link', () => {
    mockPath = '/chat';
    render(<NavTree />);
    expect(screen.getByRole('link', { name: 'Chat with Data' })).toHaveAttribute('href', '/chat');
  });

  it('calls onItemClick when a link is clicked', () => {
    const onItemClick = vi.fn();
    render(<NavTree onItemClick={onItemClick} />);
    fireEvent.click(screen.getByRole('link', { name: 'Upcoming' }));
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });

  it('routes every link through renderItemWrapper when provided', () => {
    const wrapper = vi.fn((children: React.ReactNode, key: string) => (
      <div key={key} data-testid={`w-${key}`}>
        {children}
      </div>
    ));
    render(<NavTree renderItemWrapper={wrapper} />);
    expect(screen.getByTestId('w-/inbox')).toBeInTheDocument();
    expect(wrapper).toHaveBeenCalled();
  });
});

describe('NavTree active state', () => {
  it('highlights Upcoming on /upcoming only', () => {
    mockPath = '/upcoming';
    render(<NavTree />);
    expect(screen.getByRole('link', { name: 'Upcoming' }).className).toContain('from-emerald-600');
    expect(screen.getByRole('link', { name: 'Home' }).className).not.toContain('from-emerald-600');
  });

  it('highlights Settings on /settings/activity', () => {
    mockPath = '/settings/activity';
    render(<NavTree />);
    expect(screen.getByRole('link', { name: 'Settings' }).className).toContain('from-emerald-600');
  });

  it('highlights Import but not Transactions on /transactions/import', () => {
    mockPath = '/transactions/import';
    render(<NavTree />);
    expect(screen.getByRole('link', { name: 'Import' }).className).toContain('from-emerald-600');
    expect(screen.getByRole('link', { name: 'Transactions' }).className).not.toContain('from-emerald-600');
  });
});

describe('NavTree inbox badge', () => {
  it('is hidden when the summary has not loaded', () => {
    render(<NavTree />);
    expect(screen.queryByTestId('inbox-nav-badge')).not.toBeInTheDocument();
  });

  it('is hidden at zero', () => {
    mockSummary = { badge: 0 };
    render(<NavTree />);
    expect(screen.queryByTestId('inbox-nav-badge')).not.toBeInTheDocument();
  });

  it('shows the count from useInboxSummary', () => {
    mockSummary = { badge: 5 };
    render(<NavTree />);
    expect(screen.getByTestId('inbox-nav-badge')).toHaveTextContent('5');
  });

  it('caps at 99+', () => {
    mockSummary = { badge: 150 };
    render(<NavTree />);
    expect(screen.getByTestId('inbox-nav-badge')).toHaveTextContent('99+');
  });

  it('shows exactly 99 without the plus', () => {
    mockSummary = { badge: 99 };
    render(<NavTree />);
    expect(screen.getByTestId('inbox-nav-badge')).toHaveTextContent(/^99$/);
  });

  it('prefers the inboxCount prop over the summary', () => {
    mockSummary = { badge: 5 };
    render(<NavTree inboxCount={2} />);
    expect(screen.getByTestId('inbox-nav-badge')).toHaveTextContent('2');
  });

  it('puts the badge on Inbox only', () => {
    mockSummary = { badge: 4 };
    render(<NavTree />);
    expect(screen.getAllByTestId('inbox-nav-badge')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Inbox/ })).toContainElement(screen.getByTestId('inbox-nav-badge'));
  });
});
