import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarClock,
  CheckSquare,
  CreditCard,
  DollarSign,
  FolderTree,
  Gift,
  Home,
  Import,
  Inbox,
  Landmark,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Settings as SettingsIcon,
  Sparkles,
  Tags,
  Wallet,
} from 'lucide-react';
import React from 'react';

import { legacyHref } from '@/features/shell/routes';

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  /** Optional count badge; rendered only when a positive number is set. */
  badge?: number | null;
}

export interface NavModule {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

export const NAV_ITEMS = {
  home: {
    href: legacyHref('/dashboard'),
    label: 'Home',
    shortLabel: 'Home',
    icon: <Home className="h-5 w-5" />,
  },
  inbox: {
    href: legacyHref('/inbox'),
    label: 'Inbox',
    shortLabel: 'Inbox',
    icon: <Inbox className="h-5 w-5" />,
  },
  upcoming: {
    href: legacyHref('/upcoming'),
    label: 'Upcoming',
    shortLabel: 'Upcoming',
    icon: <CalendarClock className="h-5 w-5" />,
  },
  chat: {
    href: legacyHref('/chat'),
    label: 'Chat with Data',
    shortLabel: 'Chat',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  accounts: {
    href: legacyHref('/accounts'),
    label: 'Accounts',
    shortLabel: 'Accounts',
    icon: <Wallet className="h-5 w-5" />,
  },

  // Transactions module items
  transactions: {
    href: legacyHref('/transactions'),
    label: 'Transactions',
    shortLabel: 'Transactions',
    icon: <Receipt className="h-5 w-5" />,
  },
  needsReview: {
    href: legacyHref('/transactions/review'),
    label: 'Needs Review',
    shortLabel: 'Review',
    icon: <CheckSquare className="h-5 w-5" />,
  },
  transactionsImport: {
    href: legacyHref('/transactions/import'),
    label: 'Import',
    shortLabel: 'Import',
    icon: <Import className="h-5 w-5" />,
  },
  dashboards: {
    href: legacyHref('/dashboards'),
    label: 'Dashboards',
    shortLabel: 'Dashboards',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  reports: {
    href: legacyHref('/reports'),
    label: 'Reports',
    shortLabel: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  rules: {
    href: legacyHref('/rules'),
    label: 'Rules',
    shortLabel: 'Rules',
    icon: <Tags className="h-5 w-5" />,
  },
  categories: {
    href: legacyHref('/rules/categories'),
    label: 'Category Manager',
    shortLabel: 'Categories',
    icon: <FolderTree className="h-5 w-5" />,
  },
  // Rewards module items
  rewardsOverview: {
    href: legacyHref('/rewards'),
    label: 'Overview',
    shortLabel: 'Overview',
    icon: <Gift className="h-5 w-5" />,
  },
  rewardsRules: {
    href: legacyHref('/rewards/rules'),
    label: 'Earning rules',
    shortLabel: 'Earning rules',
    icon: <Tags className="h-5 w-5" />,
  },
  rewardsRecommend: {
    href: legacyHref('/rewards/recommend'),
    label: 'Card Picker',
    shortLabel: 'Card Picker',
    icon: <CreditCard className="h-5 w-5" />,
  },

  // Investments module items
  investmentsHoldings: {
    href: legacyHref('/investments'),
    label: 'Holdings',
    shortLabel: 'Holdings',
    icon: <Briefcase className="h-5 w-5" />,
  },
  investmentsTradebook: {
    href: legacyHref('/investments/tradebook'),
    label: 'Tradebook',
    shortLabel: 'Tradebook',
    icon: <BookOpen className="h-5 w-5" />,
  },
  investmentsDividends: {
    href: legacyHref('/investments/dividends'),
    label: 'Dividends',
    shortLabel: 'Dividends',
    icon: <DollarSign className="h-5 w-5" />,
  },
  investmentsInstruments: {
    href: legacyHref('/investments/instruments'),
    label: 'Instruments',
    shortLabel: 'Instruments',
    icon: <Layers className="h-5 w-5" />,
  },
  investmentsCorpActions: {
    href: legacyHref('/investments/corporate-actions'),
    label: 'Corporate Actions',
    shortLabel: 'Corporate Actions',
    icon: <Sparkles className="h-5 w-5" />,
  },
  investmentsFno: {
    href: legacyHref('/investments/fno'),
    label: 'FnO',
    shortLabel: 'FnO',
    icon: <Activity className="h-5 w-5" />,
  },

  // Loans module items
  loansOverview: {
    href: legacyHref('/loans'),
    label: 'Loans',
    shortLabel: 'Loans',
    icon: <Landmark className="h-5 w-5" />,
  },
  loansLendings: {
    href: legacyHref('/loans/lendings'),
    label: 'Lendings',
    shortLabel: 'Lendings',
    icon: <DollarSign className="h-5 w-5" />,
  },

  // Settings
  settings: {
    href: legacyHref('/settings'),
    label: 'Settings',
    shortLabel: 'Settings',
    icon: <SettingsIcon className="h-5 w-5" />,
  },
};

export const TRANSACTIONS_MODULE: NavModule = {
  key: 'transactions',
  label: 'Transactions',
  icon: <Receipt className="h-5 w-5" />,
  items: [
    NAV_ITEMS.transactions,
    NAV_ITEMS.needsReview,
    NAV_ITEMS.rules,
    NAV_ITEMS.categories,
    NAV_ITEMS.transactionsImport,
  ],
};

export const REWARDS_MODULE: NavModule = {
  key: 'rewards',
  label: 'Rewards',
  icon: <Gift className="h-5 w-5" />,
  items: [
    NAV_ITEMS.rewardsOverview,
    NAV_ITEMS.rewardsRecommend,
    NAV_ITEMS.rewardsRules,
  ],
};

export const INSIGHTS_MODULE: NavModule = {
  key: 'insights',
  label: 'Insights',
  icon: <BarChart3 className="h-5 w-5" />,
  items: [NAV_ITEMS.dashboards, NAV_ITEMS.reports, NAV_ITEMS.chat],
};


export const INVESTMENTS_MODULE: NavModule = {
  key: 'investments',
  label: 'Investments & Portfolio',
  icon: <Briefcase className="h-5 w-5" />,
  items: [
    NAV_ITEMS.investmentsHoldings,
    NAV_ITEMS.investmentsTradebook,
    NAV_ITEMS.investmentsDividends,
    NAV_ITEMS.investmentsFno,
    NAV_ITEMS.investmentsCorpActions,
  ],
};

export const LOANS_MODULE: NavModule = {
  key: 'loans',
  label: 'Loans & Lendings',
  icon: <Landmark className="h-5 w-5" />,
  items: [
    NAV_ITEMS.loansOverview,
    NAV_ITEMS.loansLendings,
  ],
};
