import {
  CapWindow,
  DayOfWeek,
  RewardMerchantMatch,
} from '@/lib/rewards.types';
import { TransactionChannel } from '@/lib/transaction.types';
import { cn } from '@/lib/utils';

export const CHANNEL_OPTIONS: { value: TransactionChannel; label: string }[] = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'POS', label: 'POS' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CONTACTLESS', label: 'Tap' },
  { value: 'ATM', label: 'ATM' },
  { value: 'OTHER', label: 'Other' },
];

export const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
  { value: 'SATURDAY', label: 'Sat' },
  { value: 'SUNDAY', label: 'Sun' },
];

export const MERCHANT_MATCH_LABELS: Record<RewardMerchantMatch, string> = {
  CONTAINS: 'Contains',
  STARTS_WITH: 'Starts with',
  EXACT: 'Exact',
  REGEX: 'Regex',
};

export const CAP_WINDOW_LABELS: Record<CapWindow, string> = {
  DAY: 'Per day',
  CALENDAR_MONTH: 'Per calendar month',
  STATEMENT_CYCLE: 'Per statement cycle',
  QUARTER: 'Per quarter',
  CALENDAR_YEAR: 'Per calendar year',
  ANNIVERSARY_YEAR: 'Per anniversary year',
};

export function numOrNull(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

export const selectTriggerClass =
  'w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors';
export const inputClass =
  'text-xs h-9 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none';
export const sectionClass =
  'rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-3 flex flex-col gap-2.5';
export const sectionTitleClass =
  'text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500';
export const chipClass = (active: boolean) =>
  cn(
    'px-2 py-1 rounded-lg text-xs font-semibold border transition-colors',
    active
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'
  );
