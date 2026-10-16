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
 * Mirrors live MobileNav destinations and order: Home · Inbox · Upcoming · Transactions · More.
 * Hrefs point at live routes for now; a future unit switches each one to /ds/… as pages migrate.
 * Counts omitted for now.
 */
export const shellTabBarItems: ShellNavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/dashboard' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar', href: '/upcoming' },
  { id: 'transactions', label: 'Transactions', icon: 'transactions', href: '/transactions' },
  { id: 'more', label: 'More', icon: 'more', href: '/settings' },
];

/**
 * Rail navigation groups (desktop left navigation).
 * Mirrors live Sidebar destinations and order.
 * Hrefs point at live routes for now; a future unit switches each one to /ds/… as pages migrate.
 * Counts omitted for now.
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
    label: 'Insights',
    items: [
      { id: 'chat', label: 'Ask the data', icon: 'chat', href: '/chat' },
    ],
  },
];

export const shellFooterItems: ShellNavItem[] = [
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
];
