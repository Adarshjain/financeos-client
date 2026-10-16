import type { IconName } from '@/components/ds/Icon/Icon';

export interface ShellNavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  countSource?: string;
}

export interface ShellNavGroup {
  label?: string;
  items: ShellNavItem[];
}

/**
 * TabBar navigation items (phone bottom navigation, at most 5 items).
 * Items: Home, Inbox, Upcoming, Transactions, More.
 * More uses the 'menu' icon and points to '/ds' for now (More behavior on hold).
 */
export const shellTabBarItems: ShellNavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/dashboard' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar', href: '/upcoming' },
  { id: 'transactions', label: 'Transactions', icon: 'transactions', href: '/transactions' },
  { id: 'more', label: 'More', icon: 'menu', href: '/ds' },
];

/**
 * Rail navigation groups (desktop left navigation matching D-home board):
 * - Home · Inbox · Upcoming
 * - Money: Accounts, Transactions
 * - Grow: Investments, Rewards
 * - Owe & lend: Loans & lendings
 * - Insights: Dashboards, Reports, Ask the data
 * - footer: Settings
 */
export const shellRailGroups: ShellNavGroup[] = [
  {
    items: [
      { id: 'home', label: 'Home', icon: 'home', href: '/dashboard' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
      { id: 'upcoming', label: 'Upcoming', icon: 'calendar', href: '/upcoming' },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'accounts', label: 'Accounts', icon: 'accounts', href: '/accounts' },
      { id: 'transactions', label: 'Transactions', icon: 'transactions', href: '/transactions' },
    ],
  },
  {
    label: 'Grow',
    items: [
      { id: 'investments', label: 'Investments', icon: 'investments', href: '/investments' },
      { id: 'rewards', label: 'Rewards', icon: 'rewards', href: '/rewards' },
    ],
  },
  {
    label: 'Owe & lend',
    items: [
      { id: 'loans', label: 'Loans & lendings', icon: 'loans', href: '/loans' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'dashboards', label: 'Dashboards', icon: 'dashboards', href: '/dashboards' },
      { id: 'reports', label: 'Reports', icon: 'reports', href: '/reports' },
      { id: 'chat', label: 'Ask the data', icon: 'chat', href: '/chat' },
    ],
  },
];

export const shellFooterItems: ShellNavItem[] = [
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
];

/**
 * Computes current active navigation item ID from pathname.
 * Returns undefined for '/ds' and unknown routes (no item selected).
 */
export function getActiveNavItem(pathname: string | null | undefined): string | undefined {
  if (!pathname || pathname === '/ds' || pathname === '/ds/') {
    return undefined;
  }

  // Check rail groups
  for (const group of shellRailGroups) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        return item.id;
      }
    }
  }

  // Check footer
  for (const item of shellFooterItems) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      return item.id;
    }
  }

  return undefined;
}
