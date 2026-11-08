import type { IconName } from '@/components/ds/Icon/registry';

import { appHref } from './routes';
import { DEFAULT_TAB_SLOT, type TabSlot } from './tabSlotName';

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
 * The phone bar's second tab: the device's choice (cookie), Accounts by default. Each slot shares the rail's
 * item id, so the shared active-item logic lights it on its pages.
 */
export const shellTabSlotItems: Record<TabSlot, ShellNavItem> = {
  accounts: { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts' },
  lending: { id: 'lending', label: 'Lending', icon: 'handshake', href: '/lending' },
  investments: { id: 'investments', label: 'Investments', icon: 'chart-line-up', href: '/investments' },
  upcoming: { id: 'upcoming', label: 'Upcoming', icon: 'calendar', href: '/upcoming' },
};

/**
 * TabBar navigation items (phone bottom navigation, at most 5 items).
 * Items in order: Home, {slot}, Transactions, Inbox, Menu.
 * Menu uses the 'menu' icon and has no href (it triggers the More sheet).
 */
export function shellTabBarItemsFor(slot: TabSlot = DEFAULT_TAB_SLOT): ShellTabBarItem[] {
  return [
    { id: 'home', label: 'Home', icon: 'home', href: '/home' },
    shellTabSlotItems[slot],
    { id: 'transactions', label: 'Transactions', icon: 'list-bullets', href: '/transactions' },
    { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
    { id: 'more', label: 'Menu', icon: 'menu' },
  ];
}

/**
 * Rail navigation groups (desktop left navigation):
 * - Home · Inbox
 * - Money: Accounts, Transactions, Upcoming, Rewards
 * - Wealth: Investments, Lending
 * - Insights: Dashboards, Reports, Ask
 * - footer: Data sources, Settings
 * Accounts also owns /loans (the Loans page sits under it for now).
 */
export const shellRailGroups: ShellNavGroup[] = [
  {
    items: [
      { id: 'home', label: 'Home', icon: 'home', href: '/home' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts', also: ['/loans'] },
      { id: 'transactions', label: 'Transactions', icon: 'list-bullets', href: '/transactions' },
      { id: 'upcoming', label: 'Upcoming', icon: 'calendar', href: '/upcoming' },
      { id: 'rewards', label: 'Rewards', icon: 'gift', href: '/rewards' },
    ],
  },
  {
    label: 'Wealth',
    items: [
      { id: 'investments', label: 'Investments', icon: 'chart-line-up', href: '/investments' },
      { id: 'lending', label: 'Lending', icon: 'handshake', href: '/lending' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'dashboards', label: 'Dashboards', icon: 'squares-four', href: '/dashboards' },
      { id: 'reports', label: 'Reports', icon: 'chart-bar', href: '/reports' },
      { id: 'chat', label: 'Ask', icon: 'chat', href: '/chat' },
    ],
  },
];

export const shellFooterItems: ShellNavItem[] = [
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings', also: ['/data-sources'] },
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

/** A More sheet tile: `span: 'full'` stretches it across both columns of its group. */
export type ShellMoreItem = ShellNavItem & { span?: 'full' };

export interface ShellMoreGroup {
  label: string;
  items: ShellMoreItem[];
}

/**
 * Quick add items for the phone More sheet (P-more).
 * Transaction, Lending and Trade open their dialogs from state (no URL change).
 * Import links to /import, the page that lists the kinds of file.
 */
export const shellQuickAddItems: ShellQuickAddItem[] = [
  { id: 'transaction', label: 'Transaction', icon: 'add', dialog: 'transaction' },
  { id: 'lending', label: 'Lending', icon: 'handshake', dialog: 'lending' },
  { id: 'trade', label: 'Trade', icon: 'chart-line-up', dialog: 'trade' },
  { id: 'import', label: 'Import', icon: 'upload', href: '/import' },
];

/**
 * More sheet section groups (P-more): Money, Wealth, Insights. The Ask tile spans the full width.
 */
export const shellMoreGroups: ShellMoreGroup[] = [
  {
    label: 'Money',
    items: [
      { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts' },
      { id: 'transactions', label: 'Transactions', icon: 'list-bullets', href: '/transactions' },
      { id: 'upcoming', label: 'Upcoming', icon: 'calendar', href: '/upcoming' },
      { id: 'rewards', label: 'Rewards', icon: 'gift', href: '/rewards' },
    ],
  },
  {
    label: 'Wealth',
    items: [
      { id: 'investments', label: 'Investments', icon: 'chart-line-up', href: '/investments' },
      { id: 'lending', label: 'Lending', icon: 'handshake', href: '/lending' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'dashboards', label: 'Dashboards', icon: 'squares-four', href: '/dashboards' },
      { id: 'reports', label: 'Reports', icon: 'chart-bar', href: '/reports' },
      { id: 'chat', label: 'Ask', icon: 'chat', href: '/chat', span: 'full' },
    ],
  },
];

/**
 * Computes current active navigation item ID from pathname (/accounts/1 matches Accounts). Returns
 * undefined for the review index and unknown routes (no item selected).
 */
export function getActiveNavItem(pathname: string | null | undefined): string | undefined {
  if (!pathname) return undefined;
  const path = pathname;

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
    if ([item.href, ...(item.also ?? [])].some((p) => path === p || path.startsWith(p + '/'))) {
      return item.id;
    }
  }

  return undefined;
}

/** True on the Ask pages (a new chat and one conversation). */
export function isChatPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/chat(\/|$)/.test(pathname);
}

/** Routes with no phone tab bar: the Ask pages dock their own composer at the bottom. */
export const hidesTabBar = isChatPath;

export type CrumbArea =
  | 'home'
  | 'notifications'
  | 'accounts'
  | 'transactions'
  | 'upcoming'
  | 'lendings'
  | 'loans'
  | 'investments'
  | 'rewards'
  | 'dashboards'
  | 'reports'
  | 'chat'
  | 'settings'
  | 'dataSources';

export interface CrumbEntry {
  /** The rail group above the area: the crumb of the area's own pages. */
  group: string;
  /** The area's name: the crumb of pages beneath it (a detail page, a sub-page). */
  label: string;
  /** The area's own page: where a back button or a not-found page leads. */
  href: string;
}

/**
 * The one crumb map: every area, the rail group it sits in, and its own page. Every ShellPage crumb comes from
 * `areaCrumb` or `subCrumb`, never from a literal. Home sits under Insights (it is the default dashboard) and
 * the Inbox updates under Inbox.
 */
export const crumbMap: Record<CrumbArea, CrumbEntry> = {
  home: { group: 'Insights', label: 'Home', href: appHref('/home') },
  notifications: { group: 'Inbox', label: 'Updates', href: appHref('/inbox/updates') },
  accounts: { group: 'Money', label: 'Accounts', href: appHref('/accounts') },
  transactions: { group: 'Money', label: 'Transactions', href: appHref('/transactions') },
  upcoming: { group: 'Money', label: 'Upcoming', href: appHref('/upcoming') },
  lendings: { group: 'Wealth', label: 'Lending', href: appHref('/lending') },
  loans: { group: 'Money', label: 'Loans', href: appHref('/loans') },
  investments: { group: 'Wealth', label: 'Investments', href: appHref('/investments') },
  rewards: { group: 'Money', label: 'Rewards', href: appHref('/rewards') },
  dashboards: { group: 'Insights', label: 'Dashboards', href: appHref('/dashboards') },
  reports: { group: 'Insights', label: 'Reports', href: appHref('/reports') },
  chat: { group: 'Insights', label: 'Ask', href: appHref('/chat') },
  settings: { group: 'Settings', label: 'Settings', href: appHref('/settings') },
  dataSources: { group: 'Settings', label: 'Data sources', href: appHref('/data-sources') },
};

/** The crumb of an area's own pages (its list, tabs, a single-page area): "Money". */
export function areaCrumb(area: CrumbArea): string {
  return crumbMap[area].group;
}

/** The crumb of a page beneath an area: "Money / Accounts", or deeper with `rest` ("Money / Transactions / Import"). */
export function subCrumb(area: CrumbArea, ...rest: string[]): string {
  const { group, label } = crumbMap[area];
  return [group, label, ...rest].join(' / ');
}
