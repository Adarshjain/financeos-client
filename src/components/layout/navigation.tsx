import {
  BarChart3,
  Home,
  LayoutDashboard,
  Receipt,
  Settings,
  Tags,
  TrendingUp,
  Wallet,
} from 'lucide-react';

/**
 * Single registry for the app's navigation destinations.
 *
 * Sidebar and MobileNav previously declared these routes independently — the
 * same eight hrefs and icons written out twice, so adding a route or changing an
 * icon meant editing both.
 *
 * `shortLabel` exists because the mobile labels are deliberately different, not
 * accidentally divergent: the bottom bar is horizontally cramped, so /dashboard
 * reads "Home" and /investments reads "Investments" there while the sidebar uses
 * the full names. Keeping both in one place preserves that intent while removing
 * the duplication.
 */
export interface NavItem {
  href: string;
  label: string;
  /** Used where horizontal space is tight (the mobile bottom bar). */
  shortLabel?: string;
  icon: React.ReactNode;
}

export const NAV: Record<string, NavItem> = {
  dashboard: {
    href: '/dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    icon: <Home className="h-5 w-5" />,
  },
  accounts: {
    href: '/accounts',
    label: 'Accounts',
    icon: <Wallet className="h-5 w-5" />,
  },
  transactions: {
    href: '/transactions',
    label: 'Transactions',
    icon: <Receipt className="h-5 w-5" />,
  },
  rules: {
    href: '/rules',
    label: 'Rules',
    icon: <Tags className="h-5 w-5" />,
  },
  investments: {
    href: '/investments',
    label: 'Investments',
    shortLabel: 'Investments',
    icon: <TrendingUp className="h-5 w-5" />,
  },
  reports: {
    href: '/reports',
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  dashboards: {
    href: '/dashboards',
    label: 'Dashboards',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  settings: {
    href: '/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
  },
};

/** Desktop sidebar: every destination, in order. */
export const SIDEBAR_NAV: NavItem[] = [
  NAV.dashboard,
  NAV.accounts,
  NAV.transactions,
  NAV.rules,
  NAV.investments,
  NAV.reports,
  NAV.dashboards,
  NAV.settings,
];

/** Mobile bottom bar: the three most-used destinations. */
export const MOBILE_BAR_NAV: NavItem[] = [
  NAV.dashboard,
  NAV.transactions,
  NAV.investments,
];

/** Mobile overflow menu: everything the bottom bar doesn't show. */
export const MOBILE_MENU_NAV: NavItem[] = [
  NAV.accounts,
  NAV.rules,
  NAV.reports,
  NAV.dashboards,
  NAV.settings,
];

/** Routes where the mobile bottom bar is suppressed. */
export const HIDE_MOBILE_NAV_ON: string[] = ['/transactions/review'];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}
