import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getActiveNavItem,
  shellFooterItems,
  shellRailGroups,
  shellTabBarItems,
} from '../navigation';
import { ShellRail, ShellTabBar } from '../ShellNav';

let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
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

  it('matches TabBar items with menu icon and href /ds on More', () => {
    expect(shellTabBarItems.map((i) => i.id)).toEqual([
      'home',
      'inbox',
      'upcoming',
      'transactions',
      'more',
    ]);
    const moreItem = shellTabBarItems.find((i) => i.id === 'more')!;
    expect(moreItem.icon).toBe('menu');
    expect(moreItem.href).toBe('/ds');
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
});
