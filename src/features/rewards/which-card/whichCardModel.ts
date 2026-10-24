import { formatAmount, formatDayMonth, formatPct, formatRupees } from '@/features/accounts/list/accountsList';
import { amountExpressionValue } from '@/lib/amountExpression';
import type {
  RewardCardRecommendation,
  RewardRecommendationRequest,
  RewardRecommendationResponse,
  SimulatedMilestone,
  SimulatedRuleLine,
} from '@/lib/rewards.types';
import { REASON_META } from '@/lib/rewards.types';
import type { TransactionChannel } from '@/lib/transaction.types';

import type { WhichCardOption } from './whichCardData';

/** The "any" choice of the single selects: the request leaves that field out. */
export const ANY = 'ANY';

export const AMOUNT_ERROR = 'Please enter a valid spend amount greater than ₹0';

export const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: ANY, label: 'Any / All' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'POS', label: 'In person · POS' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CONTACTLESS', label: 'Contactless' },
  { value: 'ATM', label: 'ATM' },
  { value: 'OTHER', label: 'Other' },
];

const CHANNELS = CHANNEL_OPTIONS.filter((o) => o.value !== ANY).map((o) => o.value);

export interface WhichCardForm {
  amount: string;
  /** YYYY-MM-DD. */
  date: string;
  /** One category, or ANY. */
  categoryId: string;
  moreCategoryIds: string[];
  channel: string;
  merchantText: string;
  mcc: string;
  isEmi: boolean;
  isIntl: boolean;
  /** The cards to compare; none means all of them. */
  accountIds: string[];
}

export function initialForm(today: string): WhichCardForm {
  return {
    amount: '5000',
    date: today,
    categoryId: ANY,
    moreCategoryIds: [],
    channel: ANY,
    merchantText: '',
    mcc: '',
    isEmi: false,
    isIntl: false,
    accountIds: [],
  };
}

/** The request for the form, or the message to show on the amount when it cannot be sent. */
export function buildRequest(
  form: WhichCardForm
): { ok: true; request: RewardRecommendationRequest } | { ok: false; error: string } {
  const amount = amountExpressionValue(form.amount);
  if (amount === null || amount <= 0) return { ok: false, error: AMOUNT_ERROR };
  const categoryIds = [...new Set([form.categoryId === ANY ? '' : form.categoryId, ...form.moreCategoryIds].filter(Boolean))];
  const mcc = form.mcc.trim();
  const merchantText = form.merchantText.trim();
  return {
    ok: true,
    request: {
      amount,
      date: form.date || undefined,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      mcc: mcc || undefined,
      merchantText: merchantText || undefined,
      channel: CHANNELS.includes(form.channel) ? (form.channel as TransactionChannel) : undefined,
      isEmi: form.isEmi,
      isIntl: form.isIntl,
      accountIds: form.accountIds.length > 0 ? form.accountIds : undefined,
    },
  };
}

/** ₹ with paise only when the amount has them. */
export function money(value: number): string {
  return Number.isInteger(value) ? formatRupees(value) : `₹${formatAmount(value, 2)}`;
}

/** "Ranked for ₹4,500 dining today": the spend, its categories and the day. */
export function resultTitle(
  input: RewardRecommendationRequest,
  categories: WhichCardOption[],
  today: string
): string {
  const names = (input.categoryIds ?? [])
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter((n): n is string => !!n);
  const day = !input.date || input.date === today ? 'today' : `on ${formatDayMonth(input.date)}`;
  return ['Ranked for', money(input.amount), names.join(', ').toLowerCase(), day].filter(Boolean).join(' ');
}

export function cardsEvaluated(count: number): string {
  return `${count} card${count === 1 ? '' : 's'} evaluated`;
}

export interface Note {
  tone: 'warning' | 'neutral';
  text: string;
}

/** The notes under a card's row: an assumed point value, the cycle fallback, a card with no rules. */
export function cardNotes(card: RewardCardRecommendation): Note[] {
  const notes: Note[] = [];
  if (card.pointValueSource === 'DEFAULT' && card.pointsValued) {
    notes.push({ tone: 'warning', text: `Assumed ${money(card.pointValueInr)}/pt` });
  }
  if (card.cycleFallback) notes.push({ tone: 'warning', text: 'Statement cycle fallback active' });
  if (card.noRulesConfigured) notes.push({ tone: 'neutral', text: 'No reward rules configured' });
  return notes;
}

export interface CardRow {
  accountId: string;
  rank: number;
  name: string;
  best: boolean;
  earn: string;
  effective: string;
  /** "Guaranteed ₹300 + milestone ₹250". */
  detail: string;
  notes: Note[];
}

export function cardRow(card: RewardCardRecommendation): CardRow {
  return {
    accountId: card.accountId,
    rank: card.rank,
    name: card.accountName,
    best: card.rank === 1,
    earn: money(card.totalValueInr),
    effective: `${formatPct(card.effectiveRatePct)} effective return`,
    detail:
      `Guaranteed ${money(card.guaranteedValueInr)}` +
      (card.milestoneValueInr > 0 ? ` + milestone ${money(card.milestoneValueInr)}` : ''),
    notes: cardNotes(card),
  };
}

export interface Assumptions {
  /** "Regalia ₹0.50 · Amex ₹0.25", for the cards whose points were turned into rupees. */
  pointValues: string | null;
  mcc: string | null;
}

export function assumptions(result: RewardRecommendationResponse): Assumptions {
  const valued = result.recommendations.filter((c) => c.pointsValued && c.pointValueInr > 0);
  return {
    pointValues: valued.length > 0 ? valued.map((c) => `${c.accountName} ${money(c.pointValueInr)}`).join(' · ') : null,
    mcc: result.input.mcc?.trim() || null,
  };
}

type Tone = 'neutral' | 'info' | 'warning' | 'success';

const REASON_TONE: Record<SimulatedRuleLine['reason'], Tone> = {
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

export interface RuleLineView {
  key: string;
  name: string;
  stacking: string | null;
  outcome: { label: string; tone: Tone };
  earned: string;
  /** "= ₹300" under a points line. */
  earnedValue: string | null;
  cap: { text: string; remaining: number; total: number } | null;
}

export function ruleLineView(line: SimulatedRuleLine, index: number): RuleLineView {
  const meta = REASON_META[line.reason];
  const cap = line.capStatus;
  return {
    key: `${line.ruleId ?? 'base'}:${index}`,
    name: line.ruleName || 'Base rule evaluation',
    stacking: line.stacking ?? null,
    outcome: { label: meta?.label ?? String(line.reason), tone: REASON_TONE[line.reason] ?? 'neutral' },
    earned: line.earnedUnit === 'POINTS' ? `${formatAmount(line.earned, 0)} pts` : money(line.earned),
    earnedValue: line.earnedUnit === 'POINTS' ? `= ${money(line.earnedValueInr)}` : null,
    cap: cap
      ? {
          text:
            `Cap headroom ${money(cap.capRemainingBefore)} of ${money(cap.totalCap)}` +
            (cap.bucketName ? ` (shared: ${cap.bucketName})` : '') +
            (cap.windowEnd ? ` · window ends ${formatDayMonth(cap.windowEnd)}` : ''),
          remaining: cap.capRemainingBefore,
          total: cap.totalCap,
        }
      : null,
  };
}

export interface MilestoneView {
  key: string;
  name: string;
  value: string;
  progress: string;
  crosses: boolean;
  status: string;
}

export function milestoneView(m: SimulatedMilestone): MilestoneView {
  return {
    key: m.milestoneId,
    name: m.name,
    value: `+${money(m.scoredValueInr)}`,
    progress: `Progress ${money(m.progress)} / ${money(m.threshold)}`,
    crosses: m.crosses,
    status: m.crosses
      ? 'Crosses the threshold on this spend'
      : `${money(m.remainingToThreshold)} to go · valued at ${money(m.scoredValueInr)}`,
  };
}

export interface Breakdown {
  title: string;
  summary: { label: string; value: string }[];
  lines: RuleLineView[];
  milestones: MilestoneView[];
}

export function breakdown(card: RewardCardRecommendation): Breakdown {
  const summary = [{ label: 'Guaranteed', value: money(card.guaranteedValueInr) }];
  if (card.milestoneValueInr > 0) summary.push({ label: 'Milestone', value: money(card.milestoneValueInr) });
  summary.push({ label: 'Total', value: money(card.totalValueInr) });
  summary.push({ label: 'Effective return', value: formatPct(card.effectiveRatePct) });
  return {
    title: card.accountName,
    summary,
    lines: card.ruleLines.map(ruleLineView),
    milestones: card.milestones.map(milestoneView),
  };
}
