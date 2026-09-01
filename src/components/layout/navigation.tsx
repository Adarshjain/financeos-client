import React from 'react';

import {
  INVESTMENTS_MODULE,
  LOANS_MODULE,
  NAV_ITEMS,
  NavItem,
  NavModule,
  REPORTS_MODULE,
  REWARDS_MODULE,
  TRANSACTIONS_MODULE,
} from './navigation/navItems';

export type { NavItem, NavModule } from './navigation/navItems';
export {
  INVESTMENTS_MODULE,
  LOANS_MODULE,
  NAV_ITEMS,
  REPORTS_MODULE,
  REWARDS_MODULE,
  TRANSACTIONS_MODULE,
} from './navigation/navItems';

export type MobileNavContextMode =
  | 'default'
  | 'transactions'
  | 'rewards'
  | 'reports'
  | 'investments'
  | 'loans';

export function getMobileNavContext(pathname: string): {
  mode: MobileNavContextMode;
  items: NavItem[];
} {
  if (pathname.startsWith('/loans')) {
    return {
      mode: 'loans',
      items: [
        NAV_ITEMS.loansOverview,
        NAV_ITEMS.loansLendings,
        NAV_ITEMS.loansCalendar,
      ],
    };
  }
  if (pathname.startsWith('/investments')) {
    return {
      mode: 'investments',
      items: [
        NAV_ITEMS.investmentsHoldings,
        NAV_ITEMS.investmentsTradebook,
        NAV_ITEMS.investmentsDividends,
        NAV_ITEMS.investmentsInstruments,
        NAV_ITEMS.investmentsCorpActions,
        NAV_ITEMS.investmentsFno,
      ],
    };
  }

  if (
    pathname.startsWith('/reports') ||
    pathname.startsWith('/dashboards')
  ) {
    return {
      mode: 'reports',
      items: [NAV_ITEMS.dashboards, NAV_ITEMS.reports],
    };
  }

  if (pathname.startsWith('/rewards')) {
    return {
      mode: 'rewards',
      items: [
        NAV_ITEMS.rewardsOverview,
        NAV_ITEMS.rewardsRules,
        NAV_ITEMS.rewardsRecommend,
      ],
    };
  }

  if (
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/rules') ||
    pathname.startsWith('/categories')
  ) {
    return {
      mode: 'transactions',
      items: [
        NAV_ITEMS.transactions,
        NAV_ITEMS.needsReview,
        NAV_ITEMS.rules,
        NAV_ITEMS.categories,
      ],
    };
  }

  return {
    mode: 'default',
    items: [
      NAV_ITEMS.home,
      NAV_ITEMS.transactions,
      {
        href: '/investments',
        label: 'Investments',
        shortLabel: 'Investments',
        icon: NAV_ITEMS.investmentsHoldings.icon,
      },
      NAV_ITEMS.loansOverview,
      {
        href: '/dashboards',
        label: 'Reports',
        shortLabel: 'Reports',
        icon: NAV_ITEMS.reports.icon,
      },
      {
        href: '/rewards',
        label: 'Rewards',
        shortLabel: 'Rewards',
        icon: NAV_ITEMS.rewardsOverview.icon,
      },
    ],
  };
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }
  // For sub-routes / detail pages (e.g. /transactions/123),
  // match prefix ONLY if no other registered route has a longer, more specific match.
  if (pathname.startsWith(href + '/')) {
    const allHrefs = Object.values(NAV_ITEMS).map((item) => item.href);
    const matchesMoreSpecific = allHrefs.some(
      (otherHref) =>
        otherHref !== href &&
        otherHref.length > href.length &&
        (pathname === otherHref || pathname.startsWith(otherHref + '/'))
    );
    return !matchesMoreSpecific;
  }
  return false;
}

export function getNavigationTree(
  needsReviewCount?: number | null
): NavItem[] {
  return [
    NAV_ITEMS.home,
    NAV_ITEMS.chat,
    NAV_ITEMS.accounts,
    {
      ...NAV_ITEMS.transactions,
    },
    {
      ...NAV_ITEMS.needsReview,
      label: needsReviewCount
        ? `Needs Review (${needsReviewCount})`
        : 'Needs Review',
    },
    NAV_ITEMS.rules,
    NAV_ITEMS.categories,
    NAV_ITEMS.investmentsHoldings,
    NAV_ITEMS.loansOverview,
    NAV_ITEMS.dashboards,
    NAV_ITEMS.reports,
    NAV_ITEMS.rewardsOverview,
    NAV_ITEMS.settings,
  ];
}
