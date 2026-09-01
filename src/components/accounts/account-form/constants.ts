import { CreditCard, Landmark, TrendingUp, Wallet } from 'lucide-react';

import { AccountType } from '@/lib/types';

export const financialPositions = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
];

export const COMMON_BROKERS = [
  'Zerodha',
  'Groww',
  'SBI MF',
  'Upstox',
  'Angel One',
  'ICICI Direct',
  'HDFC Securities',
  'Kuvera',
  'Coin',
  'Paytm Money',
];

export const ACCOUNT_TYPE_CONFIG: Record<
  AccountType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    activeClassName: string;
  }
> = {
  [AccountType.BANK_ACCOUNT]: {
    label: 'Bank',
    icon: Landmark,
    activeClassName:
      'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold',
  },
  [AccountType.CREDIT_CARD]: {
    label: 'Credit Card',
    icon: CreditCard,
    activeClassName:
      'bg-amber-50/60 dark:bg-amber-950/20 border-amber-500 text-amber-700 dark:text-amber-400 font-semibold',
  },
  [AccountType.BROKER]: {
    label: 'Broker',
    icon: TrendingUp,
    activeClassName:
      'bg-blue-50/60 dark:bg-blue-950/20 border-blue-500 text-blue-700 dark:text-blue-400 font-semibold',
  },
  [AccountType.GENERIC]: {
    label: 'Wallet/Cash',
    icon: Wallet,
    activeClassName:
      'bg-purple-50/60 dark:bg-purple-950/20 border-purple-500 text-purple-700 dark:text-purple-400 font-semibold',
  },
};
