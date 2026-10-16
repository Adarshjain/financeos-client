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

describe('shell navigation', () => {
  beforeEach(() => {
    mockPathname = '/dashboard';
  });

  it('matches Rail board D-home structure', () => {
    // 5 groups: Unlabeled (Home, Inbox, Upcoming), Money, Grow, Owe & lend, Insights
    expect(shellRailGroups).toHaveLength(5);
    expect(shellRailGroups[0].label).toBeUndefined();
    expect(shellRailGroups[0].items.map((i) => i.id)).toEqual(['home', 'inbox', 'upcoming']);

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
      'inbox',
      'upcoming',
      'transactions',
      'more',
    ]);
    const moreItem = shellTabBarItems.find((i) => i.id === 'more')!;
    expect(moreItem.icon).toBe('menu');
    expect(moreItem.href).toBeUndefined();
  });

  it('getActiveNavItem computes current item correctly and returns undefined for /ds', () => {
    expect(getActiveNavItem('/ds')).toBeUndefined();
    expect(getActiveNavItem('/ds/')).toBeUndefined();
    expect(getActiveNavItem('/dashboard')).toBe('home');
    expect(getActiveNavItem('/inbox')).toBe('inbox');
    expect(getActiveNavItem('/upcoming')).toBe('upcoming');
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

  it('ShellTabBar highlights current tab on /dashboard and none on /ds', () => {
    mockPathname = '/dashboard';
    const { unmount } = render(<ShellTabBar />);
    const homeTab = screen.getByRole('tab', { name: /Home/i });
    expect(homeTab.getAttribute('aria-current')).toBe('page');
    unmount();

    mockPathname = '/ds';
    render(<ShellTabBar />);
    const allTabs = screen.getAllByRole('tab');
    for (const tab of allTabs) {
      expect(tab.getAttribute('aria-current')).toBeNull();
    }
  });

  it('ShellRail renders user and groups', () => {
    mockPathname = '/accounts';
    render(<ShellRail user={{ name: 'Arjun Mehta', email: 'arjun@example.test' }} />);
    expect(screen.getByText('Accounts')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('matches quick add items and more groups configuration', () => {
    expect(shellQuickAddItems).toHaveLength(4);
    expect(shellQuickAddItems.map((i) => i.label)).toEqual([
      'Transaction',
      'Lending',
      'Trade',
      'Import',
    ]);
    expect(shellQuickAddItems.find((i) => i.id === 'transaction')?.disabled).toBe(true);
    expect(shellQuickAddItems.find((i) => i.id === 'lending')?.disabled).toBe(true);
    expect(shellQuickAddItems.find((i) => i.id === 'trade')?.disabled).toBe(true);
    expect(shellQuickAddItems.find((i) => i.id === 'import')?.href).toBe('/transactions/import');

    expect(shellMoreGroups).toHaveLength(3);
    expect(shellMoreGroups[0].label).toBe('Money');
    expect(shellMoreGroups[1].label).toBe('Grow');
    expect(shellMoreGroups[2].label).toBe('Owe & lend · Insights');
  });

  it('ShellTabBar opens More sheet when More tab is tapped, and toggles closed on More again', () => {
    render(<ShellTabBar user={{ name: 'Arjun Mehta', email: 'arjun@example.test' }} />);

    // Initially sheet is not open
    expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument();

    // Tap More
    const moreTab = screen.getByRole('tab', { name: /More/i });
    fireEvent.click(moreTab);

    // Sheet is now open
    const dialog = screen.getByRole('dialog', { name: 'More' });
    expect(dialog).toBeInTheDocument();

    // Verify Quick add items
    expect(screen.getByRole('button', { name: /Transaction/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Lending/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Trade/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Import/i })).toHaveAttribute('href', '/transactions/import');

    // Verify Section links
    expect(screen.getByRole('link', { name: /Accounts/i })).toHaveAttribute('href', '/accounts');
    expect(screen.getByRole('link', { name: /Transactions/i })).toHaveAttribute('href', '/transactions');
    expect(screen.getByRole('link', { name: /Investments/i })).toHaveAttribute('href', '/investments');
    expect(screen.getByRole('link', { name: /Rewards/i })).toHaveAttribute('href', '/rewards');
    expect(screen.getByRole('link', { name: /Loans & lendings/i })).toHaveAttribute('href', '/loans');
    expect(screen.getByRole('link', { name: /Dashboards/i })).toHaveAttribute('href', '/dashboards');
    expect(screen.getByRole('link', { name: /Reports/i })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: /Ask the data/i })).toHaveAttribute('href', '/chat');

    // Verify Profile row
    const profileLink = screen.getByRole('link', { name: /Arjun Mehta/i });
    expect(profileLink).toHaveAttribute('href', '/settings');

    // Tap More again to toggle closed
    fireEvent.click(moreTab);
    expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
  });
});
