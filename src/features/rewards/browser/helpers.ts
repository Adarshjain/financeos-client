import { formatCount, formatMoney, formatQuantity } from '@/lib/format';
import {
  MilestoneStatus,
  RewardLine,
} from '@/lib/rewards.types';
import { anniversaryYearRange } from '@/lib/rewards.types';

export function lineDescription(line: RewardLine): string {
  return line.description || line.sourcedDescription || '—';
}

export function milestoneProgressText(m: MilestoneStatus): string {
  return m.basis === 'SPEND'
    ? `${formatMoney(m.progress)} of ${formatMoney(m.threshold)}`
    : `${formatCount(m.progress)} of ${formatCount(m.threshold, 'txns')}${
        m.minTxnAmount ? ` (${formatMoney(m.minTxnAmount)}+ each)` : ''
      }`;
}

/** Sum of the payouts a set of milestones pays (or would pay) out, as "₹2,500 + 5000 pts". */
export function milestonePayoutTotal(list: MilestoneStatus[]): string {
  const paying = list.filter((m) => m.payoutType === 'CASH_VALUE');
  const inr = paying
    .filter((m) => m.rewardType !== 'POINTS')
    .reduce((s, m) => s + (m.payoutValue ?? 0), 0);
  const pts = paying
    .filter((m) => m.rewardType === 'POINTS')
    .reduce((s, m) => s + (m.payoutValue ?? 0), 0);
  return [
    inr > 0 ? formatMoney(inr, { decimals: 'auto' }) : null,
    pts > 0 ? `${formatQuantity(pts, 2)} pts` : null,
  ]
    .filter(Boolean)
    .join(' + ');
}

export { isRangePreset, RANGE_PRESET_LABELS, RANGE_PRESETS, type RangePreset } from '@/features/accounts/detail/rewards/rewardsPeriod';
import type { RangePreset } from '@/features/accounts/detail/rewards/rewardsPeriod';

export function presetRange(
  preset: Exclude<RangePreset, 'CUSTOM'>,
  anniversary: string | null
): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'THIS_ANNIVERSARY_YEAR':
      return anniversaryYearRange(anniversary, 0);
    case 'LAST_ANNIVERSARY_YEAR':
      return anniversaryYearRange(anniversary, -1);
    case 'THIS_MONTH':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case 'LAST_MONTH':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case 'LAST_3_MONTHS':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        to: now,
      };
    case 'THIS_FY': {
      // Indian financial year: April 1 onwards.
      const fyYear =
        now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return { from: new Date(fyYear, 3, 1), to: now };
    }
  }
}

export function formatEarned(line: {
  earned: number;
  earnedUnit: 'RUPEES' | 'POINTS';
}): string {
  return line.earnedUnit === 'POINTS'
    ? `${formatQuantity(line.earned, 2)} pts`
    : formatMoney(line.earned, { decimals: 'auto' });
}
