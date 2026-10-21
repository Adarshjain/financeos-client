import type { IconName } from '@/components/ds/Icon/Icon';

import { normalisePathname } from './routes';

export interface ShellNavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  countSource?: string;
  /** Other path prefixes that count as this item (Inbox also owns /upcoming). */
  also?: string[];
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
 * Items: Home, Inbox, Accounts, Transactions, More.
 * More uses the 'menu' icon and has no href (it triggers the More sheet).
 */
export const shellTabBarItems: ShellTabBarItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/dashboard' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
  { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts' },
  { id: 'transactions', label: 'Transactions', icon: 'list-bullets', href: '/transactions' },
  { id: 'more', label: 'More', icon: 'menu' },
];

/**
 * Rail navigation groups (desktop left navigation matching D-home board):
 * - Home · Inbox (also /upcoming)
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
      { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox', also: ['/upcoming'] },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts' },
      { id: 'transactions', label: 'Transactions', icon: 'list-bullets', href: '/transactions' },
    ],
  },
  {
    label: 'Grow',
    items: [
      { id: 'investments', label: 'Investments', icon: 'chart-line-up', href: '/investments' },
      { id: 'rewards', label: 'Rewards', icon: 'gift', href: '/rewards' },
    ],
  },
  {
    label: 'Owe & lend',
    items: [
      { id: 'loans', label: 'Loans & lendings', icon: 'handshake', href: '/loans/lendings', also: ['/loans'] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'dashboards', label: 'Dashboards', icon: 'squares-four', href: '/dashboards' },
      { id: 'reports', label: 'Reports', icon: 'chart-bar', href: '/reports' },
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
  /** Opens a dialog from state instead of navigating (the app provides the dialog). */
  dialog?: 'lending';
}

export interface ShellMoreGroup {
  label: string;
  items: ShellNavItem[];
}

/**
 * Quick add items for the phone More sheet (P-more).
 * Transaction and Trade have no dedicated routes yet (Legacy dialogs), so they are disabled until
 * the owner decides on their routes. Lending opens the Add lending dialog from state (no URL change).
 * Import links to /transactions/import.
 */
export const shellQuickAddItems: ShellQuickAddItem[] = [
  { id: 'transaction', label: 'Transaction', icon: 'add', disabled: true },
  { id: 'lending', label: 'Lending', icon: 'handshake', dialog: 'lending' },
  { id: 'trade', label: 'Trade', icon: 'chart-line-up', disabled: true },
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
      { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts' },
      { id: 'transactions', label: 'Transactions', icon: 'list-bullets', href: '/transactions' },
    ],
  },
  {
    label: 'Grow',
    items: [
      { id: 'investments', label: 'Investments', icon: 'chart-line-up', href: '/investments' },
      { id: 'rewards', label: 'Rewards', icon: 'gift', href: '/rewards' },
    ],
  },
  {
    label: 'Owe & lend · Insights',
    items: [
      { id: 'loans', label: 'Loans & lendings', icon: 'handshake', href: '/loans/lendings', also: ['/loans'] },
      { id: 'dashboards', label: 'Dashboards', icon: 'squares-four', href: '/dashboards' },
      { id: 'reports', label: 'Reports', icon: 'chart-bar', href: '/reports' },
      { id: 'chat', label: 'Ask the data', icon: 'chat', href: '/chat' },
    ],
  },
];

/**
 * Computes current active navigation item ID from pathname. Item hrefs are Legacy-shaped, so a Dinero
 * pathname is normalised first (/ds/accounts/1 matches Accounts). Returns undefined for the Dinero
 * index, /ds/notifications and unknown routes (no item selected).
 */
export function getActiveNavItem(pathname: string | null | undefined): string | undefined {
  if (!pathname) return undefined;
  const path = normalisePathname(pathname);

  // Check rail groups
  for (const group of shellRailGroups) {
    for (const item of group.items) {
      const prefixes = [item.href, ...(item.also ?? [])];
      if (prefixes.some((p) => path === p || path.startsWith(p + '/'))) {
        return item.id;
      }
    }
  }

  // Check footer
  for (const item of shellFooterItems) {
    if (path === item.href || path.startsWith(item.href + '/')) {
      return item.id;
    }
  }

  return undefined;
}
