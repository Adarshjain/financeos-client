import { daysBetween } from '@/features/accounts/detail/overview/overviewDatesModel';
import type { RewardsWindow } from '@/features/accounts/detail/overview/rewardsWindowModel';
import { parsePage, setPageParam } from '@/features/shell/pagination';
import { formatDateRangeCompressed } from '@/lib/date-range';
import { formatCount, formatDate, formatMoney, formatPercent, pluralize } from '@/lib/format';
import type { CapWindow, MilestoneStatus, RewardLine, RewardReport, RewardRule, RewardRuleBreakdown } from '@/lib/rewards.types';
import { REASON_META } from '@/lib/rewards.types';

import { capitalize, DEFAULT_PERIOD, isIsoDate, isRangePreset, periodWords, type RangePreset } from './rewardsPeriodModel';

export type { RewardsWindow };

export const PAGE_SIZES = [25, 50, 100] as const;
export const REWARDS_TXN_PAGE_SIZE = 25;

function pts(n: number): string {
  return formatCount(n, 'pts');
}

// ---- KPI tiles -------------------------------------------------------------

export interface RewardsKpi {
  key: 'eligible' | 'gross' | 'adjustments' | 'effective';
  label: string;
  value: string;
  context?: string;
  /** Danger while the figure is a net cost. */
  tone?: 'danger';
  /** Points are earned but the card has no point value, so they stay points beside the rupees. */
  needsPointValue?: boolean;
}

export function windowLabel(window: RewardsWindow, preset?: RangePreset): string {
  const range = formatDateRangeCompressed(window.from, window.to);
  if (preset && preset !== DEFAULT_PERIOD) return `${capitalize(periodWords(preset, window))} ${range}`;
  return `${window.calendarYear ? 'Calendar year' : 'Anniversary year'} ${range}`;
}

/** The four tiles; a tile the report has no figure for (effective return) is left out. */
export function buildKpis(report: RewardReport, window: RewardsWindow, preset?: RangePreset): RewardsKpi[] {
  const s = report.summary;
  const totalPts = s.points + s.milestonesPts;
  const unvalued = totalPts > 0 && s.pointsValueInr == null;

  // grossValueInr = cashback + cash milestones + points valued at the card's point value.
  const grossValue = unvalued
    ? s.grossValueInr > 0
      ? `${formatMoney(s.grossValueInr)} + ${pts(totalPts)}`
      : pts(totalPts)
    : totalPts > 0
      ? pts(totalPts)
      : formatMoney(s.grossValueInr);
  const grossContext: string[] = [];
  if (totalPts > 0 && s.pointsValueInr != null) {
    grossContext.push(`≈ ${formatMoney(s.grossValueInr)} at ${formatMoney(s.pointsValueInr / totalPts, { decimals: 'exact' })} / pt`);
  }
  if (s.cashbackInr > 0 && (totalPts > 0 || s.milestonesInr > 0)) grossContext.push(`${formatMoney(s.cashbackInr)} cashback`);
  if (s.milestonesInr > 0) grossContext.push(`${formatMoney(s.milestonesInr)} milestones`);

  // The engine's effective value is gross + discounts - fees.
  const net = s.discounts - s.fees;
  const adjustContext: string[] = [];
  if (s.fees > 0) adjustContext.push(`${formatMoney(s.fees)} fees`);
  if (s.discounts > 0) adjustContext.push(`${formatMoney(s.discounts)} discounts`);

  const kpis: RewardsKpi[] = [
    {
      key: 'eligible',
      label: 'Eligible spend',
      value: formatMoney(s.basisSpend),
      context: `${s.matchedCount} of ${s.transactionCount} transactions earned`,
    },
    {
      key: 'gross',
      label: 'Gross rewards',
      value: grossValue,
      context: grossContext.length > 0 ? grossContext.join(' · ') : undefined,
      needsPointValue: unvalued || undefined,
    },
    {
      key: 'adjustments',
      label: 'Adjustments',
      value: formatMoney(net, { sign: 'always' }),
      tone: net < 0 ? 'danger' : undefined,
      context: adjustContext.length > 0 ? adjustContext.join(' · ') : 'no fees netted',
    },
  ];
  if (s.effectivePct != null) {
    kpis.push({ key: 'effective', label: 'Effective return', value: formatPercent(s.effectivePct), context: windowLabel(window, preset) });
  }
  return kpis;
}

// ---- Query (URL params) ----------------------------------------------------

export interface RewardsQuery {
  /** Rule filter; undefined = all rules. */
  ruleId?: string;
  /** Period preset; undefined = the current reward year. */
  period?: RangePreset;
  /** Custom range ends (YYYY-MM-DD); only with `period` CUSTOM. */
  from?: string;
  to?: string;
  /** 0-based. */
  page: number;
  size: number;
}

type Param = string | string[] | undefined;
const first = (p: Param) => (Array.isArray(p) ? p[0] : p);

/**
 * `?rule=` (only a known rule id), `?period=` (a preset; the default is left out), `?from=` and `?to=` (valid
 * dates, only for a custom period), `?page=` (1-based in the URL), `?size=` (one of the page sizes).
 */
export function parseRewardsQuery(
  params: { rule?: Param; period?: Param; from?: Param; to?: Param; page?: Param; size?: Param } | undefined,
  knownRuleIds: readonly string[]
): RewardsQuery {
  const rule = first(params?.rule);
  const rawPeriod = first(params?.period);
  const period = rawPeriod && isRangePreset(rawPeriod) && rawPeriod !== DEFAULT_PERIOD ? rawPeriod : undefined;
  const from = first(params?.from);
  const to = first(params?.to);
  return {
    ruleId: rule && knownRuleIds.includes(rule) ? rule : undefined,
    period,
    from: period === 'CUSTOM' && isIsoDate(from) ? from : undefined,
    to: period === 'CUSTOM' && isIsoDate(to) ? to : undefined,
    ...parsePage(params ?? {}, { size: REWARDS_TXN_PAGE_SIZE, sizes: PAGE_SIZES }),
  };
}

/** The tab URL for a query; defaults are left out so the plain tab stays `base`. */
export function rewardsHref(base: string, query: RewardsQuery): string {
  const params = new URLSearchParams();
  if (query.ruleId) params.set('rule', query.ruleId);
  if (query.period && query.period !== DEFAULT_PERIOD) {
    params.set('period', query.period);
    if (query.period === 'CUSTOM') {
      if (query.from) params.set('from', query.from);
      if (query.to) params.set('to', query.to);
    }
  }
  setPageParam(params, query.page);
  if (query.size !== REWARDS_TXN_PAGE_SIZE) params.set('size', String(query.size));
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
    return [...rules].sort((a, b) => b.priority - a.priority).map((r) => ({ id: r.id, label: r.name }));
  }
  return report.rules.map((r) => ({ id: r.ruleId, label: r.name }));
}

export interface LineRow {
  id: string;
  date: string;
  description: string;
  holder: string | null;
  basis: string;
  /** The basis with its ₹ (negatives read −₹), for the phone sub-line. */
  basisLabel: string;
  rule: string;
  earned: string;
  why: { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' };
  /** What the line dialog shows when the line is tapped. */
  detail: LineDetail;
}

export interface LineDetail {
  title: string;
  /** The description from the source, when it differs from the title. */
  source: string | null;
  rows: { label: string; value: string }[];
  reason: { label: string; explain: string; tone: LineRow['why']['tone'] };
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

const earnedText = (line: Pick<RewardLine, 'earned' | 'earnedUnit'>) =>
  line.earnedUnit === 'RUPEES' ? formatMoney(line.earned, { decimals: 'exact' }) : pts(line.earned);

/** The tapped line's computation: dates, amounts, MCC, channel, rule, earned, and the reason in one sentence. */
export function lineDetail(line: RewardLine): LineDetail {
  const rows: LineDetail['rows'] = [{ label: 'Transaction date', value: formatDate(line.transactionDate, 'full') }];
  if (line.effectiveDate !== line.transactionDate) {
    rows.push({ label: 'Settled (used for rewards)', value: formatDate(line.effectiveDate, 'full') });
  }
  rows.push({ label: 'Amount charged', value: formatMoney(line.amount, { decimals: 'exact' }) });
  if (line.basis !== line.amount) rows.push({ label: 'Eligible after refunds', value: formatMoney(line.basis, { decimals: 'exact' }) });
  if (line.mcc) rows.push({ label: 'MCC', value: line.mcc });
  if (line.channel) rows.push({ label: 'Channel', value: line.channel });
  rows.push({ label: 'Rule', value: line.ruleName ?? '—' });
  rows.push({ label: 'Earned', value: line.earned > 0 ? earnedText(line) : '—' });
  const title = line.description || line.sourcedDescription || '—';
  const meta = REASON_META[line.reason];
  return {
    title,
    source: line.description && line.sourcedDescription && line.description !== line.sourcedDescription ? line.sourcedDescription : null,
    rows,
    reason: { label: meta.label, explain: meta.explain, tone: WHY_TONE[line.reason] },
  };
}

export function lineRow(line: RewardLine): LineRow {
  return {
    id: `${line.transactionId}:${line.ruleId ?? ''}`,
    date: formatDate(line.effectiveDate, 'list'),
    description: line.description ?? line.sourcedDescription ?? 'Transaction',
    holder: line.cardLabel ?? null,
    basis: formatMoney(line.basis, { decimals: 'exact', symbol: false }),
    basisLabel: formatMoney(line.basis, { decimals: 'exact' }),
    rule: line.ruleName ?? 'No rule',
    earned: earnedText(line),
    why: { label: REASON_META[line.reason].label, tone: WHY_TONE[line.reason] },
    detail: lineDetail(line),
  };
}

export function linesSubtitle(total: number, window: RewardsWindow, preset?: RangePreset): string {
  return `${formatCount(total, ['line', 'lines'])} · ${capitalize(periodWords(preset, window))}`;
}

// ---- Milestones ------------------------------------------------------------

export interface MilestoneModel {
  id: string;
  /** The milestone's own name. */
  title: string;
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
  const each = !spend && m.minTxnAmount ? ` of ${formatMoney(m.minTxnAmount)}+ each` : '';
  const target = spend
    ? `Spend ${formatMoney(m.threshold, { compact: true })} in the ${noun}`
    : `${formatCount(m.threshold, ['transaction', 'transactions'])}${each} in the ${noun}`;
  const payout =
    m.payoutValue != null ? (m.rewardType === 'POINTS' ? ` → ${formatCount(m.payoutValue)} bonus pts` : ` → ${formatMoney(m.payoutValue)} bonus`) : '';
  const pct = m.threshold > 0 ? Math.min(100, Math.round((m.progress / m.threshold) * 100)) : 0;
  const pace = milestonePace(m, today);

  let status: MilestoneModel['status'] = null;
  if (m.achieved) status = { label: 'Achieved', tone: 'success' };
  else if (spend && pace && pace.daysLeft > 0) {
    status = pace.pacePerDay >= pace.needPerDay ? { label: 'On track', tone: 'success' } : { label: 'Behind', tone: 'warning' };
  }

  const caption: string[] = [formatPercent(pct, { decimals: 0 })];
  if (m.windowType === 'ONE_TIME') caption.push(`One-time ${formatDateRangeCompressed(m.windowStart, m.windowEnd)}`);
  if (m.achieved && m.payoutDate) caption.push(`credited ${formatDate(m.payoutDate, 'list')}`);
  if (pace && !m.achieved) {
    caption.push(`${formatCount(pace.daysLeft, ['day', 'days'])} left`);
    if (spend && pace.daysLeft > 0) {
      caption.push(`need ${formatMoney(Math.round(pace.needPerDay))} / day`, `pace ${formatMoney(Math.round(pace.pacePerDay))} / day`);
    }
  }

  return {
    id: m.milestoneId,
    title: m.name || 'Milestone',
    subtitle: `${target}${payout}`,
    status,
    figure: spend
      ? { done: formatMoney(m.progress), of: `of ${formatMoney(m.threshold)}` }
      : { done: String(m.progress), of: `of ${m.threshold} transactions` },
    pct,
    caption: caption.join(' · '),
  };
}

// ---- Completed milestones --------------------------------------------------

export interface CompletedMilestones {
  count: number;
  /** What the finished milestones paid, "₹2,500 + 5,000 pts"; null when none pays. */
  paid: string | null;
  rows: { id: string; title: string; subtitle: string; payout: string }[];
}

/** What a set of milestones pays, as "₹2,500 + 5,000 pts"; null when none of them pays. */
export function milestonePaid(list: readonly MilestoneStatus[]): string | null {
  const paying = list.filter((m) => m.payoutType === 'CASH_VALUE');
  const inr = paying.filter((m) => m.rewardType !== 'POINTS').reduce((sum, m) => sum + (m.payoutValue ?? 0), 0);
  const points = paying.filter((m) => m.rewardType === 'POINTS').reduce((sum, m) => sum + (m.payoutValue ?? 0), 0);
  const parts = [inr > 0 ? formatMoney(inr) : null, points > 0 ? pts(points) : null].filter(Boolean);
  return parts.length > 0 ? parts.join(' + ') : null;
}

/** Every achieved milestone window, latest credit first, each with the day it was credited. */
export function completedMilestones(milestones: readonly MilestoneStatus[]): CompletedMilestones | null {
  const done = milestones
    .filter((m) => m.achieved)
    .sort((a, b) => (b.payoutDate ?? b.windowEnd).localeCompare(a.payoutDate ?? a.windowEnd));
  if (done.length === 0) return null;
  return {
    count: done.length,
    paid: milestonePaid(done),
    rows: done.map((m) => ({
      id: `${m.milestoneId}:${m.windowStart}`,
      title: m.name || 'Milestone',
      subtitle: [
        m.windowType === 'ONE_TIME' ? 'One-time' : null,
        formatDateRangeCompressed(m.windowStart, m.windowEnd),
        m.payoutDate ? `credited ${formatDate(m.payoutDate, 'list')}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      payout:
        m.payoutType !== 'CASH_VALUE'
          ? 'Tracker'
          : m.rewardType === 'POINTS'
            ? pts(m.payoutValue ?? 0)
            : formatMoney(m.payoutValue ?? 0),
    })),
  };
}

// ---- Rules on this account -------------------------------------------------

export interface CapBar {
  key: string;
  /** "₹3,200 of ₹5,000 · resets 1 Nov". */
  label: string;
  pct: number;
  tone: 'brand' | 'warning' | 'danger';
}

export interface RuleLine {
  id: string;
  title: string;
  description: string;
  earned: string;
}

export interface RuleExtras {
  /** One bar for the cap, or one per cardholder when the cap counts per cardholder. */
  bars: CapBar[];
  /** Set when the rule earned nothing in the period. */
  note: string | null;
}

/** Amber from 80% of the cap, red once it is hit. */
export function capTone(pct: number): CapBar['tone'] {
  return pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'brand';
}

function capBars(rule: RewardRuleBreakdown): CapBar[] {
  const cap = rule.capStatus;
  if (!cap || cap.cap <= 0) return [];
  const points = rule.earnedUnit === 'POINTS';
  const amount = (n: number) => (points ? formatCount(n) : formatMoney(n));
  const capText = points ? formatCount(cap.cap, 'pts') : formatMoney(cap.cap);
  const resets = `resets ${formatDate(cap.windowEnd, 'list')}`;
  const pct = (used: number) => Math.min(100, Math.round((used / cap.cap) * 100));
  if (cap.counterScope === 'PER_CARDHOLDER' && (cap.perCard ?? []).length > 0) {
    return (cap.perCard ?? []).map((c) => ({
      key: c.cardId ?? 'unattributed',
      label: `${c.cardLabel}: ${amount(c.used)} of ${capText} · ${resets}`,
      pct: pct(c.used),
      tone: capTone(pct(c.used)),
    }));
  }
  if (cap.used == null) return [];
  const shared = cap.sharedBucket ? `Shared "${cap.sharedBucket}" ` : '';
  const fallback = cap.cycleFallback ? ' (month fallback)' : '';
  return [
    {
      key: 'cap',
      label: `${shared}${amount(cap.used)} of ${capText}${fallback} · ${resets}`,
      pct: pct(cap.used),
      tone: capTone(pct(cap.used)),
    },
  ];
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
  else if (rule.accrualType === 'PERCENT' && rule.percentRate != null) parts.push(formatPercent(rule.percentRate, { decimals: 2 }));
  else if (rule.accrualType === 'SLAB' && rule.pointsPerSlab != null && rule.slabSize != null) {
    parts.push(`${cash ? formatMoney(rule.pointsPerSlab) : formatCount(rule.pointsPerSlab, 'pts')} / ${formatMoney(rule.slabSize)}`);
  }

  if (rule.periodCap != null && rule.periodCap > 0) {
    const cap = cash ? formatMoney(rule.periodCap) : formatCount(rule.periodCap);
    parts.push(`cap ${cap}${rule.capWindow ? ` / ${CAP_NOUN[rule.capWindow]}` : ''}`);
  }
  if (noCriteria) parts.push('everything else');
  return parts.join(' · ');
}

/** One row per rule, highest priority first as the server evaluates them (first match wins), with what each earned this year. Falls back to the report's rules when the rule list failed. */
export function ruleLines(rules: readonly RewardRule[] | null, report: RewardReport): RuleLine[] {
  const earnedFor = (id: string) => {
    const b = report.rules.find((r) => r.ruleId === id);
    if (!b) return pts(0);
    return b.earnedUnit === 'RUPEES' ? formatMoney(b.earned) : pts(b.earned);
  };
  if (rules && rules.length > 0) {
    return [...rules]
      .sort((a, b) => b.priority - a.priority)
      .map((r) => ({ id: r.id, title: r.name, description: ruleDescription(r), earned: earnedFor(r.id) }));
  }
  return report.rules.map((r) => ({ id: r.ruleId, title: r.name, description: '', earned: earnedFor(r.ruleId) }));
}

/** A rule's cap bars and, when it earned nothing in the period, the plain note saying so (no guessed cause). */
export function ruleExtras(id: string, rules: readonly RewardRule[] | null, report: RewardReport): RuleExtras {
  const b = report.rules.find((r) => r.ruleId === id);
  const name = rules?.find((r) => r.id === id)?.name ?? b?.name ?? 'Rule';
  return { bars: b ? capBars(b) : [], note: (b?.earned ?? 0) === 0 ? `${name} earned nothing this period` : null };
}

// ---- Banners and the cardholder split -------------------------------------------

export interface RewardsBanner {
  key: 'cycle' | 'anniversary' | 'unattributed';
  text: string;
  /** "Manage cards": opens the account's Cards tab. */
  action?: { label: string };
}

/** The amber notes of the report, worded as the live page does. */
export function rewardsBanners(report: RewardReport): RewardsBanner[] {
  const banners: RewardsBanner[] = [];
  if (report.cycleFallback) {
    banners.push({
      key: 'cycle',
      text: 'Some statement-cycle caps fell back to calendar months — add statements for this account to get exact cycle windows.',
    });
  }
  if (report.anniversaryFallback) {
    banners.push({
      key: 'anniversary',
      text: 'Some anniversary-year windows fell back to calendar years — set the card’s anniversary date by editing the account on the Accounts page.',
    });
  }
  const n = report.perCardAttributionIncomplete ?? 0;
  if (n > 0) {
    banners.push({
      key: 'unattributed',
      text: `${formatCount(n, ['transaction', 'transactions'])} on this multi-card account ${pluralize(n, 'is', 'are')} unattributed and could not match card-scoped rules or limits.`,
      action: { label: 'Manage cards' },
    });
  }
  return banners;
}

export interface CardholderRow {
  id: string;
  title: string;
  subtitle: string;
  earned: string;
}

/** The split by cardholder, with the transactions that have no card as Unattributed; none unless the account has two or more cards. */
export function cardholderRows(report: RewardReport): CardholderRow[] {
  const cards = report.byCard ?? [];
  if (cards.length < 2) return [];
  return cards.map((c) => ({
    id: c.cardId ?? 'unattributed',
    title: c.unattributed ? 'Unattributed' : c.cardLabel,
    subtitle: `${formatCount(c.txnCount, ['transaction', 'transactions'])} · ${formatMoney(c.basisSpend)} spend`,
    earned: c.points > 0 ? `${c.cashbackInr > 0 ? `${formatMoney(c.cashbackInr)} + ` : ''}${pts(c.points)}` : formatMoney(c.cashbackInr),
  }));
}

/** The last page index when `page` is past the end of `total` rows; null when `page` is fine. */
export function clampedPage(page: number, size: number, total: number): number | null {
  if (total <= 0 || page * size < total) return null;
  return Math.ceil(total / size) - 1;
}
