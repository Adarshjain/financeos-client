import type { CapWindow, CounterScope, RewardCapBucket, RewardRule, RewardType } from '@/lib/rewards.types';

export const CAP_WINDOW_LABELS: Record<CapWindow, string> = {
  DAY: 'Per day',
  CALENDAR_MONTH: 'Per calendar month',
  STATEMENT_CYCLE: 'Per statement cycle',
  QUARTER: 'Per quarter',
  CALENDAR_YEAR: 'Per calendar year',
  ANNIVERSARY_YEAR: 'Per anniversary year',
};

export const CAP_WINDOW_OPTIONS = (Object.keys(CAP_WINDOW_LABELS) as CapWindow[]).map((value) => ({
  value,
  label: CAP_WINDOW_LABELS[value],
}));

export const REWARD_TYPE_OPTIONS: { value: RewardType; label: string }[] = [
  { value: 'CASH', label: 'Cash ₹' },
  { value: 'POINTS', label: 'Reward points' },
];

export const COUNTER_SCOPE_OPTIONS: { value: CounterScope; label: string }[] = [
  { value: 'ACCOUNT', label: 'Per account (pooled)' },
  { value: 'PER_CARDHOLDER', label: 'Per cardholder' },
];

const grouped = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** "5,000 pts" or "₹500". */
export function capAmountText(cap: number, rewardType: RewardType): string {
  return rewardType === 'POINTS' ? `${grouped(cap)} pts` : `₹${grouped(cap)}`;
}

/** Positions (1-based, top of the list first: the highest priority is evaluated first) of the rules that draw from this cap. */
export function rulePositionsUsing(bucketId: string, rules: RewardRule[]): number[] {
  return [...rules]
    .sort((a, b) => b.priority - a.priority)
    .flatMap((rule, index) => (rule.capBucketId === bucketId ? [index + 1] : []));
}

/** "5,000 pts per calendar month · per cardholder · used by rule 1". */
export function capSubtitle(bucket: RewardCapBucket, rules: RewardRule[]): string {
  const parts = [
    `${capAmountText(bucket.cap, bucket.rewardType)} ${CAP_WINDOW_LABELS[bucket.windowType].toLowerCase()}`,
  ];
  if (bucket.counterScope === 'PER_CARDHOLDER') parts.push('per cardholder');
  const positions = rulePositionsUsing(bucket.id, rules);
  if (positions.length > 0) {
    parts.push(`used by rule${positions.length === 1 ? '' : 's'} ${positions.join(', ')}`);
  } else if (bucket.ruleCount > 0) {
    parts.push(`${bucket.ruleCount} rule${bucket.ruleCount === 1 ? '' : 's'}`);
  } else {
    parts.push('not used by any rule');
  }
  return parts.join(' · ');
}
