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
 * Items in order: Home, Transactions, Lendings, Inbox, Menu.
 * Lendings shares the rail's 'loans' id, so the shared active-item logic lights it on /loans/*.
 * Menu uses the 'menu' icon and has no href (it triggers the More sheet); Accounts lives in that sheet.
 */
export const shellTabBarItems: ShellTabBarItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/dashboard' },
  { id: 'transactions', label: 'Transactions', icon: 'list-bullets', href: '/transactions' },
  { id: 'loans', label: 'Lendings', icon: 'handshake', href: '/loans/lendings', also: ['/loans'] },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
  { id: 'more', label: 'Menu', icon: 'menu' },
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
  dialog?: 'lending' | 'trade' | 'transaction';
}

export interface ShellMoreGroup {
  label: string;
  items: ShellNavItem[];
}

/**
 * Quick add items for the phone More sheet (P-more).
 * Transaction, Lending and Trade open their dialogs from state (no URL change).
 * Import links to /transactions/import.
 */
export const shellQuickAddItems: ShellQuickAddItem[] = [
  { id: 'transaction', label: 'Transaction', icon: 'add', dialog: 'transaction' },
  { id: 'lending', label: 'Lending', icon: 'handshake', dialog: 'lending' },
  { id: 'trade', label: 'Trade', icon: 'chart-line-up', dialog: 'trade' },
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
 * pathname is normalised first (/accounts/1 matches Accounts). Returns undefined for the Dinero
 * index, /notifications and unknown routes (no item selected).
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

/** True on the Ask the data pages (a new chat and one conversation). */
export function isChatPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/chat(\/|$)/.test(normalisePathname(pathname));
}

/** Routes with no phone tab bar: the Ask the data pages dock their own composer at the bottom. */
export const hidesTabBar = isChatPath;
