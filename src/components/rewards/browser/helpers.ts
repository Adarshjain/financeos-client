import {
  MilestoneStatus,
  RewardLine,
} from '@/lib/rewards.types';
import { anniversaryYearRange } from '@/lib/rewards.types';
import { formatMoney } from '@/lib/utils';

export function lineDescription(line: RewardLine): string {
  return line.description || line.sourcedDescription || '—';
}

export function milestoneProgressText(m: MilestoneStatus): string {
  return m.basis === 'SPEND'
    ? `${formatMoney(m.progress)} of ${formatMoney(m.threshold)}`
    : `${m.progress} of ${m.threshold} txns${
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
    inr > 0 ? formatMoney(inr) : null,
    pts > 0 ? `${pts} pts` : null,
  ]
    .filter(Boolean)
    .join(' + ');
}

export type RangePreset =
  | 'THIS_ANNIVERSARY_YEAR'
  | 'LAST_ANNIVERSARY_YEAR'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'LAST_3_MONTHS'
  | 'THIS_FY'
  | 'CUSTOM';

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  THIS_ANNIVERSARY_YEAR: 'This anniversary year',
  LAST_ANNIVERSARY_YEAR: 'Previous anniversary year',
  THIS_MONTH: 'This month',
  LAST_MONTH: 'Last month',
  LAST_3_MONTHS: 'Last 3 months',
  THIS_FY: 'This FY',
  CUSTOM: 'Custom range',
};

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
    ? `${line.earned} pts`
    : formatMoney(line.earned);
}
