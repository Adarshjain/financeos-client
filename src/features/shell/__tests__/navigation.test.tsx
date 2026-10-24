import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getActiveNavItem,
  shellFooterItems,
  shellMoreGroups,
  shellQuickAddItems,
  shellRailGroups,
  shellTabBarItems,
} from '../navigation';
import { ShellRail, ShellTabBar } from '../ShellNav';

let mockPathname = '/dashboard';
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));

let mockInboxBadge = 0;
vi.mock('@/lib/query/hooks/useInbox', () => ({
  useInboxSummary: () => ({ data: { badge: mockInboxBadge } }),
}));

describe('shell navigation', () => {
  beforeEach(() => {
    mockPathname = '/dashboard';
    mockInboxBadge = 0;
  });

  it('matches Rail board D-home structure', () => {
    // 5 groups: Unlabeled (Home, Inbox), Money, Grow, Owe & lend, Insights
    expect(shellRailGroups).toHaveLength(5);
    expect(shellRailGroups[0].label).toBeUndefined();
    expect(shellRailGroups[0].items.map((i) => i.id)).toEqual(['home', 'inbox']);

    expect(shellRailGroups[1].label).toBe('Money');
    expect(shellRailGroups[1].items.map((i) => i.id)).toEqual(['accounts', 'transactions']);

    expect(shellRailGroups[2].label).toBe('Grow');
    expect(shellRailGroups[2].items.map((i) => i.id)).toEqual(['investments', 'rewards']);

    expect(shellRailGroups[3].label).toBe('Owe & lend');
    expect(shellRailGroups[3].items.map((i) => i.id)).toEqual(['loans']);

    expect(shellRailGroups[4].label).toBe('Insights');
    expect(shellRailGroups[4].items.map((i) => i.id)).toEqual(['dashboards', 'reports', 'chat']);

    expect(shellFooterItems).toHaveLength(1);
    expect(shellFooterItems[0].id).toBe('settings');
  });

  it('matches TabBar items with menu icon and no href on More', () => {
    expect(shellTabBarItems.map((i) => i.id)).toEqual([
      'home',
      'transactions',
      'loans',
      'inbox',
      'more',
    ]);
    expect(shellTabBarItems.map((i) => i.label)).toEqual(['Home', 'Transactions', 'Lendings', 'Inbox', 'Menu']);
    const moreItem = shellTabBarItems.find((i) => i.id === 'more')!;
    expect(moreItem.icon).toBe('menu');
    expect(moreItem.href).toBeUndefined();
  });

  it('Lendings tab is active on the loans pages', () => {
    for (const p of ['/ds/loans', '/ds/loans/lendings', '/ds/loans/people/1', '/ds/loans/7']) {
      expect(getActiveNavItem(p)).toBe('loans');
    }
  });

  it('getActiveNavItem follows Dinero pages: /ds paths light the same item as their Legacy twin', () => {
    expect(getActiveNavItem('/ds/inbox')).toBe('inbox');
    expect(getActiveNavItem('/ds/upcoming')).toBe('inbox');
    expect(getActiveNavItem('/ds/upcoming/calendar')).toBe('inbox');
    expect(getActiveNavItem('/ds/accounts')).toBe('accounts');
    expect(getActiveNavItem('/ds/accounts/a1')).toBe('accounts');
    expect(getActiveNavItem('/ds/accounts/a1/rewards')).toBe('accounts');
    expect(getActiveNavItem('/ds/settings')).toBe('settings');
    expect(getActiveNavItem('/ds/settings/ai')).toBe('settings');
    expect(getActiveNavItem('/ds/notifications')).toBeUndefined();
    expect(getActiveNavItem('/dsx/inbox')).toBeUndefined();
  });

  it('shell links go to the Dinero page when built, Legacy otherwise', () => {
    mockPathname = '/ds/inbox';
    render(<ShellRail user={{ email: 'a@b.test' }} />);
    expect(screen.getByRole('link', { name: /Inbox/i })).toHaveAttribute('href', '/ds/inbox');
    expect(screen.getByRole('link', { name: /a@b.test/i })).toHaveAttribute('href', '/ds/settings');
    expect(screen.getByRole('link', { name: /Transactions/i })).toHaveAttribute('href', '/ds/transactions');
  });

  it('getActiveNavItem computes current item correctly and returns undefined for /ds', () => {
    expect(getActiveNavItem('/ds')).toBeUndefined();
    expect(getActiveNavItem('/ds/')).toBeUndefined();
    expect(getActiveNavItem('/dashboard')).toBe('home');
    expect(getActiveNavItem('/inbox')).toBe('inbox');
    expect(getActiveNavItem('/upcoming')).toBe('inbox');
    expect(getActiveNavItem('/upcoming/calendar')).toBe('inbox');
    expect(getActiveNavItem('/upcomingx')).toBeUndefined();
    expect(getActiveNavItem('/accounts')).toBe('accounts');
    expect(getActiveNavItem('/transactions')).toBe('transactions');
    expect(getActiveNavItem('/investments')).toBe('investments');
    expect(getActiveNavItem('/rewards')).toBe('rewards');
    expect(getActiveNavItem('/loans')).toBe('loans');
    expect(getActiveNavItem('/dashboards')).toBe('dashboards');
    expect(getActiveNavItem('/reports')).toBe('reports');
    expect(getActiveNavItem('/chat')).toBe('chat');
    expect(getActiveNavItem('/settings')).toBe('settings');
    expect(getActiveNavItem('/unknown')).toBeUndefined();
  });

  it('has no Upcoming entry in the rail or the tab bar; Inbox owns /upcoming', () => {
    const rail = shellRailGroups.flatMap((g) => g.items);
    expect(rail.some((i) => i.id === 'upcoming')).toBe(false);
    expect(shellTabBarItems.some((i) => i.id === 'upcoming')).toBe(false);
    expect(rail.find((i) => i.id === 'inbox')?.also).toEqual(['/upcoming']);
    expect(shellTabBarItems.some((i) => i.id === 'accounts')).toBe(false);
    expect(shellTabBarItems.find((i) => i.id === 'loans')).toMatchObject({ icon: 'handshake', href: '/loans/lendings' });
  });

  it('Rail and TabBar mark Inbox current on /upcoming', () => {
    mockPathname = '/upcoming';
    const { unmount } = render(<ShellRail user={{ email: 'a@example.test' }} />);
    expect(screen.getByRole('link', { name: /Inbox/ }).getAttribute('aria-current')).toBe('page');
    unmount();
    render(<ShellTabBar user={{ email: 'a@example.test' }} />);
    expect(screen.getByRole('tab', { name: /Inbox/ }).getAttribute('aria-current')).toBe('page');
  });

  it('ShellTabBar highlights current tab on /dashboard and none on /ds', () => {
    mockPathname = '/dashboard';
    const { unmount } = render(<ShellTabBar user={{ email: 'user@example.test' }} />);
    const homeTab = screen.getByRole('tab', { name: /Home/i });
    expect(homeTab.getAttribute('aria-current')).toBe('page');
    unmount();

    mockPathname = '/ds';
    render(<ShellTabBar user={{ email: 'user@example.test' }} />);
    const allTabs = screen.getAllByRole('tab');
    for (const tab of allTabs) {
      expect(tab.getAttribute('aria-current')).toBeNull();
    }
  });

  it('ShellRail renders user and groups with email fallback when no name', () => {
    mockPathname = '/accounts';
    render(<ShellRail user={{ email: 'arjun@example.test' }} />);
    expect(screen.getByText('Accounts')).toBeDefined();
    expect(screen.getByRole('link', { name: /arjun@example.test/i })).toHaveAttribute('href', '/ds/settings');
    expect(screen.getByText('AR')).toBeDefined();
  });

  it('Rail and TabBar show the Inbox count when there is one, capped at 99+', () => {
    mockInboxBadge = 3;
    const { unmount } = render(<ShellRail user={{ email: 'arjun@example.test' }} />);
    expect(screen.getByRole('link', { name: /Inbox/ })).toHaveTextContent('3');
    unmount();
    mockInboxBadge = 120;
    render(<ShellTabBar user={{ email: 'arjun@example.test' }} />);
    expect(screen.getByRole('tab', { name: /Inbox/ })).toHaveTextContent('99+');
  });

  it('Rail shows no Inbox count when nothing needs the user', () => {
    render(<ShellRail user={{ email: 'arjun@example.test' }} />);
    expect(screen.getByRole('link', { name: /Inbox/ })).toHaveTextContent(/^Inbox$/);
  });

  it('matches quick add items and more groups configuration', () => {
    expect(shellQuickAddItems).toHaveLength(4);
    expect(shellQuickAddItems.map((i) => i.label)).toEqual([
      'Transaction',
      'Lending',
      'Trade',
      'Import',
    ]);
    expect(shellQuickAddItems.find((i) => i.id === 'transaction')?.disabled).toBeUndefined();
    expect(shellQuickAddItems.find((i) => i.id === 'transaction')?.dialog).toBe('transaction');
    expect(shellQuickAddItems.find((i) => i.id === 'lending')?.disabled).toBeUndefined();
    expect(shellQuickAddItems.find((i) => i.id === 'lending')?.dialog).toBe('lending');
    expect(shellQuickAddItems.find((i) => i.id === 'trade')?.dialog).toBe('trade');
    expect(shellQuickAddItems.find((i) => i.id === 'import')?.href).toBe('/transactions/import');

    expect(shellMoreGroups).toHaveLength(3);
    expect(shellMoreGroups[0].label).toBe('Money');
    expect(shellMoreGroups[1].label).toBe('Grow');
    expect(shellMoreGroups[2].label).toBe('Owe & lend · Insights');
  });

  it('ShellTabBar opens More sheet when More tab is tapped, and closes when an item is chosen', () => {
    render(<ShellTabBar user={{ name: 'Arjun Mehta', email: 'arjun@example.test' }} />);

    // Initially sheet is not open
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();

    // Tap More
    const moreTab = screen.getByRole('tab', { name: /Menu/i });
    fireEvent.click(moreTab);

    // Sheet is now open
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    expect(dialog).toBeInTheDocument();

    // Verify Quick add items
    expect(screen.getByRole('button', { name: /Transaction/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Lending/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Trade/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: /Import/i })).toHaveAttribute('href', '/ds/transactions/import');

    // Verify Section links
    expect(screen.getByRole('link', { name: /Accounts/i })).toHaveAttribute('href', '/ds/accounts');
    expect(screen.getByRole('link', { name: /Transactions/i })).toHaveAttribute('href', '/ds/transactions');
    expect(screen.getByRole('link', { name: /Investments/i })).toHaveAttribute('href', '/ds/investments');
    expect(screen.getByRole('link', { name: /Rewards/i })).toHaveAttribute('href', '/ds/rewards');
    expect(screen.getByRole('link', { name: /Loans & lendings/i })).toHaveAttribute('href', '/ds/loans/lendings');
    expect(screen.getByRole('link', { name: /Dashboards/i })).toHaveAttribute('href', '/dashboards');
    expect(screen.getByRole('link', { name: /Reports/i })).toHaveAttribute('href', '/ds/reports');
    expect(screen.getByRole('link', { name: /Ask the data/i })).toHaveAttribute('href', '/chat');

    // Verify Profile row
    const profileLink = screen.getByRole('link', { name: /Arjun Mehta/i });
    expect(profileLink).toHaveAttribute('href', '/ds/settings');

    // Tap an item to close the sheet
    const accountsLink = screen.getByRole('link', { name: /Accounts/i });
    fireEvent.click(accountsLink);
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('ShellTabBar falls back to user email and derives initials when no name is provided', () => {
    render(<ShellTabBar user={{ email: 'priya@example.test' }} />);
    const moreTab = screen.getByRole('tab', { name: /Menu/i });
    fireEvent.click(moreTab);

    expect(screen.getByText('priya@example.test')).toBeInTheDocument();
    expect(screen.getByText('PR')).toBeInTheDocument();
  });
});
