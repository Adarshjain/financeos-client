import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockPath = '/dashboard';
let mockSummary: { badge: number } | undefined;
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }));
vi.mock('@/actions/auth', () => ({ logout: vi.fn() }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: mockSummary }) }));

import { MobileNav } from '../MobileNav';

function bar() {
  return within(screen.getByRole('navigation'));
}

beforeEach(() => {
  mockPath = '/dashboard';
  mockSummary = undefined;
});

describe('MobileNav default bar', () => {
  it('shows Home, Inbox, Upcoming, Transactions and a menu button, without the close X', () => {
    render(<MobileNav userEmail="u@x.com" />);
    expect(bar().getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual([
      '/dashboard',
      '/inbox',
      '/upcoming',
      '/transactions',
    ]);
    expect(bar().queryByLabelText('Return to Home')).not.toBeInTheDocument();
    expect(bar().getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument();
  });

  it('marks the current item active', () => {
    mockPath = '/upcoming';
    render(<MobileNav />);
    expect(bar().getByRole('link', { name: 'Upcoming' }).className).toContain('from-emerald-600');
    expect(bar().getByRole('link', { name: 'Home' }).className).not.toContain('from-emerald-600');
  });
});

describe('MobileNav context bars', () => {
  it.each([
    ['/transactions/review', ['Transactions', 'Review', 'Rules', 'Categories', 'Import']],
    ['/reports', ['Dashboards', 'Reports', 'Chat']],
    ['/chat', ['Dashboards', 'Reports', 'Chat']],
    ['/rewards', ['Overview', 'Card Picker', 'Earning rules']],
    ['/investments', ['Holdings', 'Tradebook', 'Dividends', 'FnO', 'Corporate Actions']],
    ['/loans', ['Loans', 'Lendings']],
  ])('on %s shows the module items and the Return to Home link', (path, labels) => {
    mockPath = path;
    render(<MobileNav />);
    const names = bar()
      .getAllByRole('link')
      .filter((l) => l.getAttribute('aria-label') !== 'Return to Home')
      .map((l) => l.textContent);
    expect(names).toEqual(labels);
    expect(bar().getByLabelText('Return to Home')).toHaveAttribute('href', '/dashboard');
  });
});

describe('MobileNav inbox badge', () => {
  it('shows the summary badge on the Inbox item', () => {
    mockSummary = { badge: 3 };
    render(<MobileNav />);
    expect(bar().getByTestId('inbox-nav-badge')).toHaveTextContent('3');
    expect(bar().getByRole('link', { name: /Inbox/ })).toContainElement(bar().getByTestId('inbox-nav-badge'));
  });

  it('is hidden at zero and when unloaded', () => {
    mockSummary = { badge: 0 };
    const { unmount } = render(<MobileNav />);
    expect(screen.queryByTestId('inbox-nav-badge')).not.toBeInTheDocument();
    unmount();
    mockSummary = undefined;
    render(<MobileNav />);
    expect(screen.queryByTestId('inbox-nav-badge')).not.toBeInTheDocument();
  });

  it('caps at 99+', () => {
    mockSummary = { badge: 120 };
    render(<MobileNav />);
    expect(bar().getByTestId('inbox-nav-badge')).toHaveTextContent('99+');
  });

  it('prefers the inboxCount prop', () => {
    mockSummary = { badge: 9 };
    render(<MobileNav inboxCount={1} />);
    expect(bar().getByTestId('inbox-nav-badge')).toHaveTextContent('1');
  });

  it('does not show the badge on other items in a context bar without Inbox', () => {
    mockPath = '/transactions';
    mockSummary = { badge: 3 };
    render(<MobileNav />);
    expect(screen.queryByTestId('inbox-nav-badge')).not.toBeInTheDocument();
  });
});
