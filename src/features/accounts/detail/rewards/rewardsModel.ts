import { formatAmount, formatCompactRupees, formatDayMonth, formatPct, formatRupees } from '@/features/accounts/list/accountsList';
import type { CapWindow, MilestoneStatus, RewardLine, RewardReport, RewardRule } from '@/lib/rewards.types';
import { REASON_META } from '@/lib/rewards.types';

import { daysBetween, plural } from '../overview/dates';
import type { RewardsWindow } from '../overview/rewardsWindow';

export type { RewardsWindow };

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

function pts(n: number): string {
  return `${formatAmount(n, 0)} pts`;
}

// ---- KPI tiles -------------------------------------------------------------

export interface RewardsKpi {
  key: 'eligible' | 'gross' | 'adjustments' | 'effective';
  label: string;
  value: string;
  context?: string;
}

export function windowLabel(window: RewardsWindow): string {
  return `${window.calendarYear ? 'calendar year' : 'anniversary year'} ${formatDayMonth(window.from)} → ${formatDayMonth(window.to)}`;
}

/** The four tiles; a tile the report has no figure for (effective return) is left out. */
export function buildKpis(report: RewardReport, window: RewardsWindow): RewardsKpi[] {
  const s = report.summary;
  const totalPts = s.points + s.milestonesPts;

  // grossValueInr = cashback + cash milestones + points valued at the card's point value.
  const grossValue = totalPts > 0 ? pts(totalPts) : formatRupees(s.grossValueInr);
  const grossContext: string[] = [];
  if (totalPts > 0 && s.pointsValueInr != null) {
    grossContext.push(`≈ ${formatRupees(s.grossValueInr)} at ₹${formatAmount(s.pointsValueInr / totalPts)} / pt`);
  }
  if (s.cashbackInr > 0 && (totalPts > 0 || s.milestonesInr > 0)) grossContext.push(`${formatRupees(s.cashbackInr)} cashback`);
  if (s.milestonesInr > 0) grossContext.push(`${formatRupees(s.milestonesInr)} milestones`);

  // The engine's effective value is gross + discounts - fees.
  const net = s.discounts - s.fees;
  const adjustContext: string[] = [];
  if (s.fees > 0) adjustContext.push(`${formatRupees(s.fees)} fees`);
  if (s.discounts > 0) adjustContext.push(`${formatRupees(s.discounts)} discounts`);

  const kpis: RewardsKpi[] = [
    {
      key: 'eligible',
      label: 'Eligible spend',
      value: formatRupees(s.basisSpend),
      context: `${s.matchedCount} of ${s.transactionCount} transactions earned`,
    },
    {
      key: 'gross',
      label: 'Gross rewards',
      value: grossValue,
      context: grossContext.length > 0 ? grossContext.join(' · ') : undefined,
    },
    {
      key: 'adjustments',
      label: 'Adjustments',
      value: net === 0 ? formatRupees(0) : `${net > 0 ? '+' : '-'}${formatRupees(Math.abs(net))}`,
      context: adjustContext.length > 0 ? adjustContext.join(' · ') : 'no fees netted',
    },
  ];
  if (s.effectivePct != null) {
    kpis.push({ key: 'effective', label: 'Effective return', value: formatPct(s.effectivePct), context: windowLabel(window) });
  }
  return kpis;
}

// ---- Query (URL params) ----------------------------------------------------

export interface RewardsQuery {
  /** Rule filter; undefined = all rules. */
  ruleId?: string;
  /** 0-based. */
  page: number;
  size: number;
}

type Param = string | string[] | undefined;
const first = (p: Param) => (Array.isArray(p) ? p[0] : p);

/** `?rule=` (only a known rule id), `?page=` (1-based in the URL), `?size=` (one of the page sizes). */
export function parseRewardsQuery(
  params: { rule?: Param; page?: Param; size?: Param } | undefined,
  knownRuleIds: readonly string[]
): RewardsQuery {
  const rule = first(params?.rule);
  const page = Number(first(params?.page));
  const size = Number(first(params?.size));
  return {
    ruleId: rule && knownRuleIds.includes(rule) ? rule : undefined,
    page: Number.isInteger(page) && page >= 1 ? page - 1 : 0,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
  };
}

/** The tab URL for a query; defaults are left out so the plain tab stays `base`. */
export function rewardsHref(base: string, query: RewardsQuery): string {
  const params = new URLSearchParams();
  if (query.ruleId) params.set('rule', query.ruleId);
  if (query.page > 0) params.set('page', String(query.page + 1));
  if (query.size !== DEFAULT_PAGE_SIZE) params.set('size', String(query.size));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ---- Earning lines ---------------------------------------------------------

export interface RuleChip {
  id: string;
  label: string;
}

export function ruleChips(rules: readonly RewardRule[] | null, report: RewardReport): RuleChip[] {
  if (rules && rules.length > 0) {
    return [...rules].sort((a, b) => a.priority - b.priority).map((r) => ({ id: r.id, label: r.name }));
  }
  return report.rules.map((r) => ({ id: r.ruleId, label: r.name }));
}

export interface LineRow {
  id: string;
  date: string;
  description: string;
  holder: string | null;
  basis: string;
  rule: string;
  earned: string;
  why: { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' };
}

const WHY_TONE: Record<RewardLine['reason'], LineRow['why']['tone']> = {
  MATCHED: 'success',
  PARTIAL_CAP: 'warning',
  CAP_EXHAUSTED: 'warning',
  EXCLUDED_BY_RULE: 'neutral',
  BELOW_SLAB: 'neutral',
  ROUNDED_TO_ZERO: 'neutral',
  TIER_ZERO: 'neutral',
  NO_RULE: 'neutral',
  FULLY_REFUNDED: 'info',
  FEE_ONLY: 'neutral',
  TRANSFER_OR_PAYMENT: 'neutral',
  TXN_EXCLUDED: 'neutral',
};

export function lineRow(line: RewardLine): LineRow {
  return {
    id: `${line.transactionId}:${line.ruleId ?? ''}`,
    date: formatDayMonth(line.effectiveDate),
    description: line.description ?? line.sourcedDescription ?? 'Transaction',
    holder: line.cardLabel ?? null,
    basis: formatAmount(line.basis, 0),
    rule: line.ruleName ?? 'No rule',
    earned: line.earnedUnit === 'RUPEES' ? formatRupees(line.earned) : pts(line.earned),
    why: { label: REASON_META[line.reason].label, tone: WHY_TONE[line.reason] },
  };
}

export function linesSubtitle(total: number, window: RewardsWindow): string {
  return `${plural(total, 'line', 'lines')} · this ${window.calendarYear ? 'calendar' : 'anniversary'} year`;
}

// ---- Milestones ------------------------------------------------------------

export interface MilestoneModel {
  id: string;
  subtitle: string;
  status: { label: 'On track' | 'Behind' | 'Achieved'; tone: 'success' | 'warning' } | null;
  figure: { done: string; of: string };
  pct: number;
  caption: string;
}

const WINDOW_NOUN: Record<MilestoneStatus['windowType'], string> = {
  CALENDAR_MONTH: 'month',
  STATEMENT_CYCLE: 'statement cycle',
  QUARTER: 'quarter',
  CALENDAR_YEAR: 'year',
  ANNIVERSARY_YEAR: 'year',
  ONE_TIME: 'period',
};

/** Spend-per-day needed to still reach the target, and the pace so far; null when the window is over or not started. */
export function milestonePace(
  m: Pick<MilestoneStatus, 'progress' | 'threshold' | 'windowStart' | 'windowEnd'>,
  today: string
): { daysLeft: number; needPerDay: number; pacePerDay: number } | null {
  const total = daysBetween(m.windowStart, m.windowEnd);
  const elapsed = daysBetween(m.windowStart, today);
  const left = daysBetween(today, m.windowEnd);
  if (total == null || elapsed == null || left == null || elapsed < 0 || left < 0) return null;
  const remaining = Math.max(0, m.threshold - m.progress);
  const need = left > 0 ? remaining / left : 0;
  return { daysLeft: left, needPerDay: need, pacePerDay: m.progress / (elapsed + 1) };
}

export function buildMilestone(m: MilestoneStatus, today: string): MilestoneModel {
  const spend = m.basis === 'SPEND';
  const noun = WINDOW_NOUN[m.windowType];
  const target = spend ? `Spend ${formatCompactRupees(m.threshold)} in the ${noun}` : `${plural(m.threshold, 'transaction', 'transactions')} in the ${noun}`;
  const payout =
    m.payoutValue != null ? (m.rewardType === 'POINTS' ? ` → ${formatAmount(m.payoutValue, 0)} bonus pts` : ` → ${formatRupees(m.payoutValue)} bonus`) : '';
  const pct = m.threshold > 0 ? Math.min(100, Math.round((m.progress / m.threshold) * 100)) : 0;
  const pace = milestonePace(m, today);

  let status: MilestoneModel['status'] = null;
  if (m.achieved) status = { label: 'Achieved', tone: 'success' };
  else if (spend && pace && pace.daysLeft > 0) {
    status = pace.pacePerDay >= pace.needPerDay ? { label: 'On track', tone: 'success' } : { label: 'Behind', tone: 'warning' };
  }

  const caption: string[] = [`${pct}%`];
  if (pace && !m.achieved) {
    caption.push(`${plural(pace.daysLeft, 'day', 'days')} left`);
    if (spend && pace.daysLeft > 0) {
      caption.push(`need ${formatRupees(Math.round(pace.needPerDay))} / day`, `pace ${formatRupees(Math.round(pace.pacePerDay))} / day`);
    }
  }

  return {
    id: m.milestoneId,
    subtitle: `${target}${payout}`,
    status,
    figure: spend
      ? { done: formatRupees(m.progress), of: `of ${formatRupees(m.threshold)}` }
      : { done: String(m.progress), of: `of ${m.threshold} transactions` },
    pct,
    caption: caption.join(' · '),
  };
}

// ---- Rules on this account -------------------------------------------------

export interface RuleLine {
  id: string;
  title: string;
  description: string;
  earned: string;
}

const CAP_NOUN: Record<CapWindow, string> = {
  DAY: 'day',
  CALENDAR_MONTH: 'month',
  STATEMENT_CYCLE: 'statement cycle',
  QUARTER: 'quarter',
  CALENDAR_YEAR: 'year',
  ANNIVERSARY_YEAR: 'year',
};

export function ruleDescription(rule: RewardRule): string {
  const cash = rule.rewardType === 'CASH';
  const parts: string[] = [];
  const noCriteria =
    !rule.mccs?.length && !rule.categories?.length && !rule.merchantPattern;
  if (rule.mccs?.length) parts.push(`MCC ${rule.mccs.join(' ')}`);
  else if (rule.categories?.length) parts.push(rule.categories.map((c) => c.name).join(', '));
  else if (rule.merchantPattern) parts.push(`"${rule.merchantPattern}"`);

  if (rule.tiers?.length) parts.push('tiered');
  else if (rule.accrualType === 'PERCENT' && rule.percentRate != null) parts.push(`${rule.percentRate}%`);
  else if (rule.accrualType === 'SLAB' && rule.pointsPerSlab != null && rule.slabSize != null) {
    parts.push(`${cash ? formatRupees(rule.pointsPerSlab) : `${rule.pointsPerSlab} pts`} / ${formatRupees(rule.slabSize)}`);
  }

  if (rule.periodCap != null && rule.periodCap > 0) {
    const cap = cash ? formatRupees(rule.periodCap) : formatAmount(rule.periodCap, 0);
    parts.push(`cap ${cap}${rule.capWindow ? ` / ${CAP_NOUN[rule.capWindow]}` : ''}`);
  }
  if (noCriteria) parts.push('everything else');
  return parts.join(' · ');
}

/** One row per rule in priority order (first match wins), with what each earned this year. Falls back to the report's rules when the rule list failed. */
export function ruleLines(rules: readonly RewardRule[] | null, report: RewardReport): RuleLine[] {
  const earnedFor = (id: string) => {
    const b = report.rules.find((r) => r.ruleId === id);
    if (!b) return pts(0);
    return b.earnedUnit === 'RUPEES' ? formatRupees(b.earned) : pts(b.earned);
  };
  if (rules && rules.length > 0) {
    return [...rules]
      .sort((a, b) => a.priority - b.priority)
      .map((r) => ({ id: r.id, title: `${r.priority} · ${r.name}`, description: ruleDescription(r), earned: earnedFor(r.id) }));
  }
  return report.rules.map((r) => ({ id: r.ruleId, title: r.name, description: '', earned: earnedFor(r.ruleId) }));
}

/** One milestone per id: the window containing `today`, else the latest window. Order of first appearance is kept. */
export function currentMilestones(milestones: readonly MilestoneStatus[], today: string): MilestoneStatus[] {
  const byId = new Map<string, MilestoneStatus>();
  for (const m of milestones) {
    const best = byId.get(m.milestoneId);
    const inWindow = (x: MilestoneStatus) => x.windowStart <= today && today <= x.windowEnd;
    if (!best) byId.set(m.milestoneId, m);
    else if (inWindow(m) ? !inWindow(best) || m.windowStart > best.windowStart : !inWindow(best) && m.windowStart > best.windowStart) {
      byId.set(m.milestoneId, m);
    }
  }
  return [...byId.values()];
}

/** The last page index when `page` is past the end of `total` rows; null when `page` is fine. */
export function clampedPage(page: number, size: number, total: number): number | null {
  if (total <= 0 || page * size < total) return null;
  return Math.ceil(total / size) - 1;
}
