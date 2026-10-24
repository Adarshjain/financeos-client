import { capTone, milestonePace } from '@/features/accounts/detail/rewards/rewardsModel';
import { formatAmount, formatDayMonth, formatRupees } from '@/features/accounts/list/accountsList';
import { accrualSummary } from '@/features/rewards/rules/manager/helpers';
import type { RewardCapBucket, RewardReport, RewardRule, RewardType } from '@/lib/rewards.types';

/** One cap's use in the reward year, drawn as a bar on its row. */
export interface CapUsage {
  pct: number;
  tone: 'brand' | 'warning' | 'danger';
  /** "0 / 5,000 · resets 1 Nov". */
  label: string;
}

/** One milestone's progress in its window, drawn as a bar on its row. */
export interface MilestoneUsage {
  pct: number;
  /** "21% · 152 d left". */
  label: string;
  /** "15 Mar → 14 Mar". */
  range: string;
}

/** What the card's reward-year report says about its rules, caps and milestones. Plain data, so a server page can pass it down. */
export interface RulesUsage {
  /** Rule id to what it earned this year ("2,180 pts"), and whether that is nothing. */
  earned: Record<string, { text: string; zero: boolean }>;
  caps: Record<string, CapUsage>;
  milestones: Record<string, MilestoneUsage>;
}

const pts = (n: number) => `${formatAmount(n, 0)} pts`;

/** The report's figures keyed by the ids of the rules, caps and milestones listed on the page. */
export function buildUsage(
  report: RewardReport,
  rules: readonly RewardRule[],
  caps: readonly RewardCapBucket[],
  today: string
): RulesUsage {
  const earned: RulesUsage['earned'] = {};
  for (const rule of rules) {
    const b = report.rules.find((r) => r.ruleId === rule.id);
    const cash = b ? b.earnedUnit === 'RUPEES' : rule.rewardType !== 'POINTS';
    const value = b?.earned ?? 0;
    earned[rule.id] = { text: cash ? formatRupees(value) : pts(value), zero: value === 0 };
  }

  const capUsage: RulesUsage['caps'] = {};
  for (const cap of caps) {
    const status = rules
      .filter((r) => r.capBucketId === cap.id)
      .map((r) => report.rules.find((b) => b.ruleId === r.id)?.capStatus)
      .find((s) => s != null);
    const perCard = status?.perCard ?? [];
    const used = status?.used ?? (perCard.length > 0 ? Math.max(...perCard.map((c) => c.used)) : 0);
    const amount = (n: number) => (cap.rewardType === 'POINTS' ? formatAmount(n, 0) : formatRupees(n));
    const pct = cap.cap > 0 ? Math.min(100, Math.round((used / cap.cap) * 100)) : 0;
    capUsage[cap.id] = {
      pct,
      tone: capTone(pct),
      label: `${amount(used)} / ${amount(cap.cap)}${status?.windowEnd ? ` · resets ${formatDayMonth(status.windowEnd)}` : ''}`,
    };
  }

  const milestones: RulesUsage['milestones'] = {};
  for (const m of report.milestones) {
    const pct = m.threshold > 0 ? Math.min(100, Math.round((m.progress / m.threshold) * 100)) : 0;
    const left = m.achieved ? null : milestonePace(m, today)?.daysLeft;
    milestones[m.milestoneId] = {
      pct,
      label: [`${pct}%`, m.achieved ? 'achieved' : left != null ? `${left} d left` : null].filter(Boolean).join(' · '),
      range: `${formatDayMonth(m.windowStart)} → ${formatDayMonth(m.windowEnd)}`,
    };
  }
  return { earned, caps: capUsage, milestones };
}

/** A rule whose end date has come (the end day itself is outside it). */
export const isEnded = (rule: RewardRule, today: string): boolean => !!rule.activeTo && rule.activeTo <= today;

const CAP_NOUN: Record<string, string> = {
  DAY: 'day',
  CALENDAR_MONTH: 'month',
  STATEMENT_CYCLE: 'cycle',
  QUARTER: 'quarter',
  CALENDAR_YEAR: 'year',
  ANNIVERSARY_YEAR: 'card year',
};

/** "5 MCCs", "Food & dining", "everything else": what the rule applies to, as the board words it. */
export function appliesTo(rule: RewardRule): string {
  const parts: string[] = [];
  const mccs = rule.mccs ?? [];
  const categories = rule.categories ?? [];
  if (categories.length > 0) parts.push(categories.map((c) => c.name).join(', '));
  if (mccs.length > 0) parts.push(mccs.length > 2 ? `${mccs.length} MCCs` : `MCC ${mccs.join(' ')}`);
  if (rule.merchantPattern) parts.push(`"${rule.merchantPattern}"`);
  if (rule.channels?.length) parts.push(rule.channels.join('/').toLowerCase());
  if (rule.daysOfWeek?.length) parts.push(rule.daysOfWeek.map((d) => d.slice(0, 3).toLowerCase()).join('/'));
  if (rule.minAmount != null || rule.maxAmount != null) parts.push(`₹${rule.minAmount ?? 0}–${rule.maxAmount ?? '∞'}`);
  if (rule.emiTreatment && rule.emiTreatment !== 'INCLUDE') parts.push(rule.emiTreatment === 'EXCLUDE_EMI' ? 'no EMI' : 'EMI only');
  if (rule.intlTreatment && rule.intlTreatment !== 'INCLUDE') parts.push(rule.intlTreatment === 'EXCLUDE_INTL' ? 'no intl' : 'intl only');
  if (rule.feeTreatment === 'EXCLUDE_FEE') parts.push('fees excluded');
  return parts.length > 0 ? parts.join(' · ') : 'everything else';
}

/** "capped 5,000 / month", "shared cap “Dining”": null when the rule has no period cap. */
export function capWords(rule: RewardRule): string | null {
  if (rule.capBucketId != null) return `shared cap “${rule.capBucketName ?? 'bucket'}”`;
  if (rule.periodCap == null) return null;
  const amount = rule.rewardType === 'POINTS' ? formatAmount(rule.periodCap, 0) : formatRupees(rule.periodCap);
  return `capped ${amount} / ${CAP_NOUN[rule.capWindow ?? 'CALENDAR_MONTH']}`;
}

/** The phone row's second line: earns · applies to · cap. Stacking, dates and earnings are on the row already. */
export function ruleSubtitle(rule: RewardRule): string {
  const parts = [accrualSummary(rule), appliesTo(rule), capWords(rule)];
  if (rule.perTxnCap != null) parts.push(`max ${rule.perTxnCap} / txn`);
  return parts.filter(Boolean).join(' · ');
}

/** "Points" or "Cash". */
export const rewardTypeWord = (type: RewardType | null | undefined): string => (type === 'POINTS' ? 'Points' : 'Cash');
