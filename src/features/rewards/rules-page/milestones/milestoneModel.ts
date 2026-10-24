import type { Cardholder } from '@/lib/account.types';
import type { MilestoneWindow, RewardMilestone, RewardType } from '@/lib/rewards.types';
import { formatDate, parseCalendarDate, toCalendarDate } from '@/lib/utils';

export const MILESTONE_WINDOW_LABELS: Record<MilestoneWindow, string> = {
  CALENDAR_MONTH: 'Calendar month',
  STATEMENT_CYCLE: 'Statement cycle',
  QUARTER: 'Quarter',
  CALENDAR_YEAR: 'Calendar year',
  ANNIVERSARY_YEAR: 'Anniversary year',
  ONE_TIME: 'One-time (welcome offer)',
};

export const MILESTONE_WINDOW_OPTIONS = (Object.keys(MILESTONE_WINDOW_LABELS) as MilestoneWindow[]).map((value) => ({
  value,
  label: MILESTONE_WINDOW_LABELS[value],
}));

export const BASIS_OPTIONS = [
  { value: 'SPEND', label: 'Eligible spend (₹)' },
  { value: 'TXN_COUNT', label: 'Transaction count' },
];

export const PAYOUT_TYPE_OPTIONS = [
  { value: 'CASH_VALUE', label: 'Fixed reward (voucher/bonus)' },
  { value: 'INFO_TRACKER', label: 'Tracker only (e.g. fee waiver)' },
];

export const PAID_AS_OPTIONS: { value: RewardType; label: string }[] = [
  { value: 'CASH', label: 'Cash ₹' },
  { value: 'POINTS', label: 'Reward points' },
];

export const PAYOUT_TIMING_OPTIONS = [
  { value: 'WINDOW_END', label: 'At window end' },
  { value: 'ON_ACHIEVEMENT', label: 'On achievement date' },
];

const WINDOW_SHORT: Record<MilestoneWindow, string> = {
  CALENDAR_MONTH: 'month',
  STATEMENT_CYCLE: 'cycle',
  QUARTER: 'quarter',
  CALENDAR_YEAR: 'year',
  ANNIVERSARY_YEAR: 'card year',
  ONE_TIME: 'one-time',
};

const grouped = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const rupees = (n: number) => `₹${grouped(n)}`;

/** "₹50,000 spend / quarter → ₹1,000 on achievement" (the Legacy summary line). */
export function milestoneSummary(m: RewardMilestone): string {
  const target =
    m.basis === 'SPEND'
      ? `${rupees(m.threshold)} spend`
      : `${grouped(m.threshold)} txns${m.minTxnAmount ? ` of ${rupees(m.minTxnAmount)}+` : ''}`;
  const value = m.payoutValue ?? 0;
  const payout =
    m.payoutType === 'CASH_VALUE'
      ? `→ ${m.rewardType === 'POINTS' ? `${grouped(value)} pts` : rupees(value)}${m.payoutTiming === 'ON_ACHIEVEMENT' ? ' on achievement' : ''}`
      : '→ tracker';
  return `${target} / ${WINDOW_SHORT[m.windowType]} ${payout}`;
}

/** Second line: eligibility restrictions and the active period, only when set. */
export function milestoneDetail(m: RewardMilestone): string {
  const parts: string[] = [];
  if (m.includeCategoryIds.length + m.includeMccs.length > 0) parts.push('restricted eligible spend');
  if (m.excludeCategoryIds.length + m.excludeMccs.length > 0) parts.push('has exclusions');
  if (m.activeFrom || m.activeTo) {
    parts.push(`${m.activeFrom ? formatDate(m.activeFrom) : 'always'} → ${m.activeTo ? formatDate(m.activeTo) : 'open-ended'}`);
  }
  return parts.join(' · ');
}

export const parseMccList = (text: string): string[] =>
  text
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

/** Label for a cardholder in the scope dropdown, as Legacy words it. */
export function cardholderLabel(c: Cardholder, isBank: boolean): string {
  const name = c.personName || (c.role === 'PRIMARY' ? 'Primary' : isBank ? 'Joint holder' : 'Add-on');
  const last4 = c.currentLast4 || c.cards?.[0]?.last4 || '';
  return `${name}${last4 ? ` (•••• ${last4})` : ''}`;
}

/** The 90-day welcome window from a card's issue date: [issued, issued + 90 days]. */
export function offerWindowFor(c: Cardholder): { from: string; to: string } | null {
  const issuedOn = c.cards?.[0]?.issuedOn || c.openedOn;
  if (!issuedOn) return null;
  const end = parseCalendarDate(issuedOn);
  end.setDate(end.getDate() + 90);
  return { from: issuedOn, to: toCalendarDate(end) };
}
