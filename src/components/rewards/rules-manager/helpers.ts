import { RewardRule } from '@/lib/rewards.types';

export const WINDOW_SHORT: Record<string, string> = {
  DAY: 'day',
  CALENDAR_MONTH: 'month',
  STATEMENT_CYCLE: 'cycle',
  QUARTER: 'quarter',
  CALENDAR_YEAR: 'year',
};

export function accrualSummary(rule: RewardRule): string {
  const points = rule.rewardType === 'POINTS';
  if (rule.tiers?.length) {
    const unit =
      rule.accrualType === 'PERCENT'
        ? '%'
        : points
        ? ` pts/₹${rule.slabSize}`
        : ` ₹/₹${rule.slabSize}`;
    const schedule = rule.tiers
      .map((t) =>
        t.upTo != null ? `${t.rate}${unit} to ₹${t.upTo}` : `then ${t.rate}${unit}`
      )
      .join(', ');
    const suffix =
      rule.accrualType === 'PERCENT' && points ? ' in points' : '';
    return `tiered: ${schedule}${suffix}`;
  }
  if (rule.accrualType === 'PERCENT') {
    return points
      ? `${rule.percentRate}% in points`
      : `${rule.percentRate}% cashback`;
  }
  return points
    ? `${rule.pointsPerSlab} pts / ₹${rule.slabSize}`
    : `₹${rule.pointsPerSlab} / ₹${rule.slabSize}`;
}

export function capSummary(rule: RewardRule): string | null {
  if (rule.capBucketId != null) {
    return `shared cap “${rule.capBucketName ?? 'bucket'}”`;
  }
  if (rule.periodCap == null) return null;
  const window = WINDOW_SHORT[rule.capWindow ?? 'CALENDAR_MONTH'];
  return rule.rewardType === 'POINTS'
    ? `cap ${rule.periodCap} pts/${window}`
    : `cap ₹${rule.periodCap}/${window}`;
}

export function matchSummary(rule: RewardRule): string {
  const parts: string[] = [];
  if (rule.categories && rule.categories.length)
    parts.push(rule.categories.map((c) => c.name).join(', '));
  if (rule.mccs && rule.mccs.length) parts.push(`MCC ${rule.mccs.join('/')}`);
  if (rule.merchantPattern) parts.push(`"${rule.merchantPattern}"`);
  if (rule.channels && rule.channels.length) parts.push(rule.channels.join('/').toLowerCase());
  if (rule.daysOfWeek && rule.daysOfWeek.length)
    parts.push(rule.daysOfWeek.map((d) => d.slice(0, 3).toLowerCase()).join('/'));
  if (rule.minAmount != null || rule.maxAmount != null) {
    parts.push(`₹${rule.minAmount ?? 0}–${rule.maxAmount ?? '∞'}`);
  }
  if (rule.emiTreatment !== 'INCLUDE')
    parts.push(rule.emiTreatment === 'EXCLUDE_EMI' ? 'no EMI' : 'EMI only');
  if (rule.intlTreatment !== 'INCLUDE')
    parts.push(rule.intlTreatment === 'EXCLUDE_INTL' ? 'no intl' : 'intl only');
  if (rule.feeTreatment === 'EXCLUDE_FEE') parts.push('no fee');
  return parts.length ? parts.join(' · ') : 'All spends';
}
