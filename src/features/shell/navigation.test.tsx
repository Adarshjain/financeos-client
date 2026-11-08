import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getActiveNavItem,
  hidesTabBar,
  shellFooterItems,
  shellMoreGroups,
  shellQuickAddItems,
  shellRailGroups,
  shellTabBarItemsFor,
} from './navigation';
import { ShellRail, ShellTabBar } from './ShellNav';
vi.mock('@/lib/query/hooks/useDataSourceIssues', () => ({ useDataSourceIssues: () => ({ connections: 0, failedJobs: 0, total: 0 }) }));

let mockPathname = '/home';
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
    mockPathname = '/home';
    mockInboxBadge = 0;
  });

  it('matches the rail structure', () => {
    // 4 groups: Unlabeled (Home, Inbox), Money, Wealth, Insights
    expect(shellRailGroups).toHaveLength(4);
    expect(shellRailGroups[0].label).toBeUndefined();
    expect(shellRailGroups[0].items.map((i) => i.id)).toEqual(['home', 'inbox']);

    expect(shellRailGroups[1].label).toBe('Money');
    expect(shellRailGroups[1].items.map((i) => i.id)).toEqual(['accounts', 'transactions', 'upcoming', 'rewards']);

    expect(shellRailGroups[2].label).toBe('Wealth');
    expect(shellRailGroups[2].items.map((i) => i.id)).toEqual(['investments', 'lending']);

    expect(shellRailGroups[3].label).toBe('Insights');
    expect(shellRailGroups[3].items.map((i) => [i.id, i.label])).toEqual([
      ['dashboards', 'Dashboards'],
      ['reports', 'Reports'],
      ['chat', 'Ask'],
    ]);

    expect(shellFooterItems.map((i) => [i.id, i.label, i.href])).toEqual([
      ['settings', 'Settings', '/settings'],
    ]);
  });

  it('matches TabBar items with menu icon and no href on More', () => {
    const items = shellTabBarItemsFor();
    expect(items.map((i) => i.id)).toEqual(['home', 'accounts', 'transactions', 'inbox', 'more']);
    expect(items.map((i) => i.label)).toEqual(['Home', 'Accounts', 'Transactions', 'Inbox', 'Menu']);
    const moreItem = items.find((i) => i.id === 'more')!;
    expect(moreItem.icon).toBe('menu');
    expect(moreItem.href).toBeUndefined();
  });

  it('the second tab follows the slot', () => {
    expect(shellTabBarItemsFor('lending')[1]).toMatchObject({ id: 'lending', label: 'Lending', href: '/lending' });
    expect(shellTabBarItemsFor('investments')[1]).toMatchObject({ id: 'investments', href: '/investments' });
    expect(shellTabBarItemsFor('upcoming')[1]).toMatchObject({ id: 'upcoming', label: 'Upcoming', href: '/upcoming' });
    expect(shellTabBarItemsFor('accounts')[1]).toMatchObject({ id: 'accounts', href: '/accounts' });
    for (const slot of ['accounts', 'lending', 'investments', 'upcoming'] as const) {
      expect(shellTabBarItemsFor(slot)).toHaveLength(5);
    }
  });

  it('the Loans pages light Accounts', () => {
    for (const p of ['/loans', '/loans/7']) {
      expect(getActiveNavItem(p)).toBe('accounts');
    }
  });

  it('the Lending pages light Lending', () => {
    for (const p of ['/lending', '/lending/p1']) {
      expect(getActiveNavItem(p)).toBe('lending');
    }
  });

  it('getActiveNavItem follows Dinero pages: each page lights its nav item', () => {
    expect(getActiveNavItem('/inbox')).toBe('inbox');
    expect(getActiveNavItem('/upcoming')).toBe('upcoming');
    expect(getActiveNavItem('/upcoming/calendar')).toBe('upcoming');
    expect(getActiveNavItem('/accounts')).toBe('accounts');
    expect(getActiveNavItem('/accounts/a1')).toBe('accounts');
    expect(getActiveNavItem('/accounts/a1/rewards')).toBe('accounts');
    expect(getActiveNavItem('/settings')).toBe('settings');
    expect(getActiveNavItem('/settings/ai')).toBe('settings');
    expect(getActiveNavItem('/data-sources/imports')).toBe('settings');
    expect(getActiveNavItem('/inbox/updates')).toBe('inbox');
    expect(getActiveNavItem('/dsx/inbox')).toBeUndefined();
  });

  it('the rail footer is the profile row only, current on Data sources pages', () => {
    mockPathname = '/data-sources/imports';
    render(<ShellRail user={{ email: 'a@b.test' }} />);
    expect(screen.queryByRole('link', { name: 'Data sources' })).toBeNull();
    expect(screen.getByRole('link', { name: /a@b.test/i })).toHaveAttribute('href', '/settings');
  });

  it('shell links go to the Dinero page', () => {
    mockPathname = '/inbox';
    render(<ShellRail user={{ email: 'a@b.test' }} />);
    expect(screen.getByRole('link', { name: /Inbox/i })).toHaveAttribute('href', '/inbox');
    expect(screen.getByRole('link', { name: /a@b.test/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: /Transactions/i })).toHaveAttribute('href', '/transactions');
  });

  it('getActiveNavItem computes current item correctly and returns undefined for /ds', () => {
    expect(getActiveNavItem('/ds')).toBeUndefined();
    expect(getActiveNavItem('/')).toBeUndefined();
    expect(getActiveNavItem('/home')).toBe('home');
    expect(getActiveNavItem('/inbox')).toBe('inbox');
    expect(getActiveNavItem('/upcoming')).toBe('upcoming');
    expect(getActiveNavItem('/upcoming/calendar')).toBe('upcoming');
    expect(getActiveNavItem('/upcomingx')).toBeUndefined();
    expect(getActiveNavItem('/accounts')).toBe('accounts');
    expect(getActiveNavItem('/transactions')).toBe('transactions');
    expect(getActiveNavItem('/investments')).toBe('investments');
    expect(getActiveNavItem('/rewards')).toBe('rewards');
    expect(getActiveNavItem('/lending')).toBe('lending');
    expect(getActiveNavItem('/dashboards')).toBe('dashboards');
    expect(getActiveNavItem('/reports')).toBe('reports');
    expect(getActiveNavItem('/chat')).toBe('chat');
    expect(getActiveNavItem('/settings')).toBe('settings');
    expect(getActiveNavItem('/unknown')).toBeUndefined();
  });

  it('hides the phone tab bar on the Ask pages only', () => {
    expect(hidesTabBar('/chat')).toBe(true);
    expect(hidesTabBar('/reports/new')).toBe(false);
    expect(hidesTabBar('/reports/r-1')).toBe(false);
    expect(hidesTabBar('/dashboards/new')).toBe(false);
    expect(hidesTabBar('/dashboards')).toBe(false);
    expect(hidesTabBar('/dashboards/d-1')).toBe(false);
    expect(hidesTabBar('/transactions/import')).toBe(false);
    expect(hidesTabBar('/chat/c-1')).toBe(true);
    expect(hidesTabBar('/chatter')).toBe(false);
    expect(hidesTabBar('/reports')).toBe(false);
    expect(hidesTabBar(null)).toBe(false);
    mockPathname = '/chat/c-1';
    const { container } = render(<ShellTabBar user={{ email: 'a@example.test' }} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('tab', { name: /Menu/i })).toBeNull();
  });

  it('keeps the phone tab bar on the Import page and a dashboard view', () => {
    mockPathname = '/transactions/import';
    render(<ShellTabBar user={{ email: 'a@example.test' }} />);
    expect(screen.getByRole('tab', { name: /Menu/i })).toBeTruthy();
  });

  it('Upcoming is its own Money item and Inbox no longer owns /upcoming', () => {
    const rail = shellRailGroups.flatMap((g) => g.items);
    expect(rail.find((i) => i.id === 'upcoming')).toMatchObject({ label: 'Upcoming', href: '/upcoming' });
    expect(rail.find((i) => i.id === 'inbox')?.also).toBeUndefined();
    expect(rail.some((i) => i.id === 'loans')).toBe(false);
  });

  it('Rail and TabBar mark Inbox current on /inbox/updates, and the slot tab on its pages', () => {
    mockPathname = '/inbox/updates';
    const { unmount } = render(<ShellRail user={{ email: 'a@example.test' }} />);
    expect(screen.getByRole('link', { name: /Inbox/ }).getAttribute('aria-current')).toBe('page');
    unmount();
    const { unmount: unmountBar } = render(<ShellTabBar user={{ email: 'a@example.test' }} />);
    expect(screen.getByRole('tab', { name: /Inbox/ }).getAttribute('aria-current')).toBe('page');
    unmountBar();
    mockPathname = '/upcoming/calendar';
    render(<ShellTabBar user={{ email: 'a@example.test' }} tabSlot="upcoming" />);
    expect(screen.getByRole('tab', { name: /Upcoming/ }).getAttribute('aria-current')).toBe('page');
  });

  it('ShellTabBar draws the slot tab second (Accounts by default)', () => {
    const { unmount } = render(<ShellTabBar user={{ email: 'a@example.test' }} />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Home', 'Accounts', 'Transactions', 'Inbox', 'Menu']);
    unmount();
    render(<ShellTabBar user={{ email: 'a@example.test' }} tabSlot="lending" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Home', 'Lending', 'Transactions', 'Inbox', 'Menu']);
    expect(tabs[1]).toHaveAttribute('href', '/lending');
  });

  it('ShellTabBar highlights current tab on /home and none on /ds', () => {
    mockPathname = '/home';
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
    expect(screen.getByRole('link', { name: /arjun@example.test/i })).toHaveAttribute('href', '/settings');
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
    expect(shellQuickAddItems.find((i) => i.id === 'import')?.href).toBe('/import');

    expect(shellMoreGroups).toHaveLength(3);
    expect(shellMoreGroups.map((g) => g.label)).toEqual(['Money', 'Wealth', 'Insights']);
    expect(shellMoreGroups[0].items.map((i) => i.label)).toEqual(['Accounts', 'Transactions', 'Upcoming', 'Rewards']);
    expect(shellMoreGroups[1].items.map((i) => i.label)).toEqual(['Investments', 'Lending']);
    expect(shellMoreGroups[2].items.map((i) => [i.label, i.span])).toEqual([
      ['Dashboards', undefined],
      ['Reports', undefined],
      ['Ask', 'full'],
    ]);
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
    expect(screen.getByRole('link', { name: /^Import$/i })).toHaveAttribute('href', '/import');

    // Verify Section links
    expect(screen.getByRole('link', { name: /Accounts/i })).toHaveAttribute('href', '/accounts');
    expect(screen.getByRole('link', { name: /Transactions/i })).toHaveAttribute('href', '/transactions');
    expect(screen.getByRole('link', { name: /Investments/i })).toHaveAttribute('href', '/investments');
    expect(screen.getByRole('link', { name: /Rewards/i })).toHaveAttribute('href', '/rewards');
    expect(screen.getByRole('link', { name: /Upcoming/i })).toHaveAttribute('href', '/upcoming');
    expect(screen.getByRole('link', { name: /Lending/i })).toHaveAttribute('href', '/lending');
    expect(screen.getByRole('link', { name: /Dashboards/i })).toHaveAttribute('href', '/dashboards');
    expect(screen.getByRole('link', { name: /Reports/i })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: /Ask/i })).toHaveAttribute('href', '/chat');
    expect(screen.getByRole('link', { name: /Ask/i }).className).toContain('col-span-2');
    expect(screen.getByRole('link', { name: /Reports/i }).className).not.toContain('col-span-2');
    expect(screen.queryByText('Hide amounts')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByText('Settings · connections · notifications')).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Data sources/i })).toBeNull();

    // Verify Profile row
    const profileLink = screen.getByRole('link', { name: /Arjun Mehta/i });
    expect(profileLink).toHaveAttribute('href', '/settings');

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
