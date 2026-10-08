import React from 'react';

import {
  INSIGHTS_MODULE,
  INVESTMENTS_MODULE,
  LOANS_MODULE,
  NAV_ITEMS,
  NavItem,
  NavModule,
  REWARDS_MODULE,
  TRANSACTIONS_MODULE,
} from './navigation/navItems';

export type { NavItem, NavModule } from './navigation/navItems';
export {
  INSIGHTS_MODULE,
  INVESTMENTS_MODULE,
  LOANS_MODULE,
  NAV_ITEMS,
  REWARDS_MODULE,
  TRANSACTIONS_MODULE,
} from './navigation/navItems';

export type MobileNavContextMode =
  | 'default'
  | 'transactions'
  | 'rewards'
  | 'insights'
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
        NAV_ITEMS.investmentsFno,
        NAV_ITEMS.investmentsCorpActions,
      ],
    };
  }

  if (
    pathname.startsWith('/reports') ||
    pathname.startsWith('/dashboards') ||
    pathname.startsWith('/chat')
  ) {
    return {
      mode: 'insights',
      items: [NAV_ITEMS.dashboards, NAV_ITEMS.reports, NAV_ITEMS.chat],
    };
  }

  if (pathname.startsWith('/rewards')) {
    return {
      mode: 'rewards',
      items: [
        NAV_ITEMS.rewardsOverview,
        NAV_ITEMS.rewardsRecommend,
        NAV_ITEMS.rewardsRules,
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
        NAV_ITEMS.transactionsImport,
      ],
    };
  }

  return {
    mode: 'default',
    items: [
      NAV_ITEMS.home,
      NAV_ITEMS.inbox,
      NAV_ITEMS.upcoming,
      NAV_ITEMS.transactions,
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
  needsReviewCount?: number | null,
  inboxCount?: number | null
): NavItem[] {
  return [
    NAV_ITEMS.home,
    { ...NAV_ITEMS.inbox, badge: inboxCount ?? null },
    NAV_ITEMS.upcoming,
    NAV_ITEMS.accounts,
    NAV_ITEMS.transactions,
    {
      ...NAV_ITEMS.needsReview,
      label: needsReviewCount
        ? `Needs Review (${needsReviewCount})`
        : 'Needs Review',
    },
    NAV_ITEMS.rules,
    NAV_ITEMS.categories,
    NAV_ITEMS.transactionsImport,
    NAV_ITEMS.investmentsHoldings,
    NAV_ITEMS.loansOverview,
    NAV_ITEMS.dashboards,
    NAV_ITEMS.reports,
    NAV_ITEMS.chat,
    NAV_ITEMS.rewardsOverview,
    NAV_ITEMS.settings,
  ];
}
