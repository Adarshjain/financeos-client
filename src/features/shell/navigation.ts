import type { IconName } from '@/components/ds/Icon/Icon';

export interface ShellNavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  countSource?: string;
}

export type ShellTabBarItem = Omit<ShellNavItem, 'href'> & {
  href?: string;
};

export interface ShellNavGroup {
  label?: string;
  items: ShellNavItem[];
}

/**
 * TabBar navigation items (phone bottom navigation, at most 5 items).
 * Items: Home, Inbox, Upcoming, Transactions, More.
 * More uses the 'menu' icon and has no href (it triggers the More sheet).
 */
export const shellTabBarItems: ShellTabBarItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/dashboard' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar', href: '/upcoming' },
  { id: 'transactions', label: 'Transactions', icon: 'transactions', href: '/transactions' },
  { id: 'more', label: 'More', icon: 'menu' },
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

export interface ShellQuickAddItem {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
  disabled?: boolean;
}

export interface ShellMoreGroup {
  label: string;
  items: ShellNavItem[];
}

/**
 * Quick add items for the phone More sheet (P-more).
 * Transaction, Lending, and Trade have no dedicated routes yet (Legacy dialogs),
 * so they are disabled until the owner decides on their routes.
 * Import links to /transactions/import.
 */
export const shellQuickAddItems: ShellQuickAddItem[] = [
  { id: 'transaction', label: 'Transaction', icon: 'add', disabled: true },
  { id: 'lending', label: 'Lending', icon: 'loans', disabled: true },
  { id: 'trade', label: 'Trade', icon: 'investments', disabled: true },
  { id: 'import', label: 'Import', icon: 'upload', href: '/transactions/import' },
];

/**
 * More sheet section groups (P-more):
 * - Money: Accounts, Transactions
 * - Grow: Investments, Rewards
 * - Owe & lend · Insights: Loans & lendings, Dashboards, Reports, Ask the data
 */
export const shellMoreGroups: ShellMoreGroup[] = [
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
    label: 'Owe & lend · Insights',
    items: [
      { id: 'loans', label: 'Loans & lendings', icon: 'loans', href: '/loans' },
      { id: 'dashboards', label: 'Dashboards', icon: 'dashboards', href: '/dashboards' },
      { id: 'reports', label: 'Reports', icon: 'reports', href: '/reports' },
      { id: 'chat', label: 'Ask the data', icon: 'chat', href: '/chat' },
    ],
  },
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
