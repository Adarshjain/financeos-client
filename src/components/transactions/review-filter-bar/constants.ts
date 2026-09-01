import { REVIEW_REASON_META, REVIEW_REASONS } from '@/components/transactions/catalog';

export const REASON_OPTIONS: { label: string; shortLabel: string; value: string }[] = [
  { label: 'All Reasons', shortLabel: 'All', value: 'ALL' },
  ...REVIEW_REASONS.map((reason) => ({
    label: REVIEW_REASON_META[reason].label,
    shortLabel: REVIEW_REASON_META[reason].shortLabel,
    value: reason as string,
  })),
];

export const SORT_OPTIONS = [
  { label: 'Newest First', value: 'date,desc' },
  { label: 'Oldest First', value: 'date,asc' },
  { label: 'Highest Amount', value: 'amount,desc' },
  { label: 'Lowest Amount', value: 'amount,asc' },
];
