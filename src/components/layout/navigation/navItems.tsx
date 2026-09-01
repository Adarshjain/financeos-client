import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  CheckSquare,
  CreditCard,
  DollarSign,
  FolderTree,
  Gift,
  Home,
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

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
}

export interface NavModule {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

export const NAV_ITEMS = {
  home: {
    href: '/dashboard',
    label: 'Home',
    shortLabel: 'Home',
    icon: <Home className="h-5 w-5" />,
  },
  chat: {
    href: '/chat',
    label: 'Chat with Data',
    shortLabel: 'Chat',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  accounts: {
    href: '/accounts',
    label: 'Accounts',
    shortLabel: 'Accounts',
    icon: <Wallet className="h-5 w-5" />,
  },

  // Transactions module items
  transactions: {
    href: '/transactions',
    label: 'Transactions',
    shortLabel: 'Transactions',
    icon: <Receipt className="h-5 w-5" />,
  },
  needsReview: {
    href: '/transactions/review',
    label: 'Needs Review',
    shortLabel: 'Review',
    icon: <CheckSquare className="h-5 w-5" />,
  },
  dashboards: {
    href: '/dashboards',
    label: 'Dashboards',
    shortLabel: 'Dashboards',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  reports: {
    href: '/reports',
    label: 'Reports',
    shortLabel: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  rules: {
    href: '/rules',
    label: 'Rules',
    shortLabel: 'Rules',
    icon: <Tags className="h-5 w-5" />,
  },
  categories: {
    href: '/rules/categories',
    label: 'Category Manager',
    shortLabel: 'Categories',
    icon: <FolderTree className="h-5 w-5" />,
  },
  // Rewards module items
  rewardsOverview: {
    href: '/rewards',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: <Gift className="h-5 w-5" />,
  },
  rewardsRules: {
    href: '/rewards/rules',
    label: 'Rules',
    shortLabel: 'Rules',
    icon: <Tags className="h-5 w-5" />,
  },
  rewardsRecommend: {
    href: '/rewards/recommend',
    label: 'Card Picker',
    shortLabel: 'Card Picker',
    icon: <CreditCard className="h-5 w-5" />,
  },

  // Investments module items
  investmentsHoldings: {
    href: '/investments',
    label: 'Holdings',
    shortLabel: 'Holdings',
    icon: <Briefcase className="h-5 w-5" />,
  },
  investmentsTradebook: {
    href: '/investments/tradebook',
    label: 'Tradebook',
    shortLabel: 'Tradebook',
    icon: <BookOpen className="h-5 w-5" />,
  },
  investmentsDividends: {
    href: '/investments/dividends',
    label: 'Dividends',
    shortLabel: 'Dividends',
    icon: <DollarSign className="h-5 w-5" />,
  },
  investmentsInstruments: {
    href: '/investments/instruments',
    label: 'Instruments',
    shortLabel: 'Instruments',
    icon: <Layers className="h-5 w-5" />,
  },
  investmentsCorpActions: {
    href: '/investments/corporate-actions',
    label: 'Corporate Actions',
    shortLabel: 'Corporate Actions',
    icon: <Sparkles className="h-5 w-5" />,
  },
  investmentsFno: {
    href: '/investments/fno',
    label: 'FnO',
    shortLabel: 'FnO',
    icon: <Activity className="h-5 w-5" />,
  },

  // Loans module items
  loansOverview: {
    href: '/loans',
    label: 'Loans',
    shortLabel: 'Loans',
    icon: <Wallet className="h-5 w-5" />,
  },
  loansLendings: {
    href: '/loans/lendings',
    label: 'Lendings',
    shortLabel: 'Lendings',
    icon: <DollarSign className="h-5 w-5" />,
  },
  loansCalendar: {
    href: '/loans/calendar',
    label: 'Obligations Calendar',
    shortLabel: 'Calendar',
    icon: <Activity className="h-5 w-5" />,
  },

  // Settings
  settings: {
    href: '/settings',
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
  ],
};

export const REWARDS_MODULE: NavModule = {
  key: 'rewards',
  label: 'Rewards',
  icon: <Gift className="h-5 w-5" />,
  items: [
    NAV_ITEMS.rewardsOverview,
    NAV_ITEMS.rewardsRules,
    NAV_ITEMS.rewardsRecommend,
  ],
};

export const REPORTS_MODULE: NavModule = {
  key: 'reports',
  label: 'Reports',
  icon: <BarChart3 className="h-5 w-5" />,
  items: [NAV_ITEMS.dashboards, NAV_ITEMS.reports],
};

export const INVESTMENTS_MODULE: NavModule = {
  key: 'investments',
  label: 'Investments & Portfolio',
  icon: <Briefcase className="h-5 w-5" />,
  items: [
    NAV_ITEMS.investmentsHoldings,
    NAV_ITEMS.investmentsTradebook,
    NAV_ITEMS.investmentsDividends,
    NAV_ITEMS.investmentsInstruments,
    NAV_ITEMS.investmentsCorpActions,
    NAV_ITEMS.investmentsFno,
  ],
};

export const LOANS_MODULE: NavModule = {
  key: 'loans',
  label: 'Loans & Lendings',
  icon: <Wallet className="h-5 w-5" />,
  items: [
    NAV_ITEMS.loansOverview,
    NAV_ITEMS.loansLendings,
    NAV_ITEMS.loansCalendar,
  ],
};
