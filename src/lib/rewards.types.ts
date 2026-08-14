import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { Page } from '@/lib/pagination';
import type { TransactionChannel } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

/**
 * Accounts the rewards engine works with: investment (broker) accounts are
 * excluded, and credit cards sort first since rewards are usually theirs.
 * Shared by the rewards pages and their client components.
 */
export function rewardEligibleAccounts(accounts: Account[]): Account[] {
  return accounts
    .filter((a) => a.type !== AccountType.BROKER)
    .sort((a, b) => Number(b.type === AccountType.CREDIT_CARD) - Number(a.type === AccountType.CREDIT_CARD));
}

/** The card's membership anniversary; null for non-cards and cards predating the field. */
export function accountAnniversaryDate(account: Account | undefined): string | null {
  return account && account.type === AccountType.CREDIT_CARD ? (account.anniversaryDate ?? null) : null;
}

/** The anniversary's month/day placed in a year — Feb 29 clamps to the month's length (mirrors the engine). */
function anniversaryOnYear(month: number, day: number, year: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/**
 * The anniversary-anchored 12-month window containing today (offset 0) or the one
 * before it (offset -1). Without an anniversary it falls back to the calendar
 * year — the same fallback the engine applies to ANNIVERSARY_YEAR windows.
 */
export function anniversaryYearRange(
  anniversary: string | null | undefined,
  offset: 0 | -1 = 0,
): { from: Date; to: Date } {
  const today = new Date();
  if (!anniversary) {
    const year = today.getFullYear() + offset;
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
  }
  const [, monthStr, dayStr] = anniversary.split('-');
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  let start = anniversaryOnYear(month, day, today.getFullYear());
  if (start > today) {
    start = anniversaryOnYear(month, day, today.getFullYear() - 1);
  }
  if (offset === -1) {
    start = anniversaryOnYear(month, day, start.getFullYear() - 1);
  }
  const nextAnchor = anniversaryOnYear(month, day, start.getFullYear() + 1);
  const to = new Date(nextAnchor.getFullYear(), nextAnchor.getMonth(), nextAnchor.getDate() - 1);
  return { from: start, to };
}

export type RuleStacking = 'EXCLUSIVE' | 'ADDITIVE';
/** Currency a rule pays in — orthogonal to the accrual math (percent/slab/tiered). */
export type RewardType = 'CASH' | 'POINTS';
export type AccrualType = 'PERCENT' | 'SLAB';
export type CashbackRounding = 'NONE' | 'FLOOR_RUPEE' | 'NEAREST_RUPEE';
export type CapWindow = 'DAY' | 'CALENDAR_MONTH' | 'STATEMENT_CYCLE' | 'QUARTER' | 'CALENDAR_YEAR' | 'ANNIVERSARY_YEAR';

export interface RewardAccountConfig {
  accountId: string;
  /** Read-only here — the anniversary is owned by the account (credit-card details). */
  rewardAnniversaryDate?: string | null;
  /** Default currency new rules pay in; each rule can override. */
  defaultRewardType?: RewardType | null;
  /** Per-account point value in INR; fallback is 0.25 when unset. */
  pointValueInr?: number | null;
}

/** PUT body — default reward type and point valuation in INR. */
export interface RewardAccountConfigRequest {
  accountId: string;
  defaultRewardType?: RewardType | null;
  pointValueInr?: number | null;
}

export type EmiTreatment = 'INCLUDE' | 'EXCLUDE_EMI' | 'ONLY_EMI';
export type IntlTreatment = 'INCLUDE' | 'EXCLUDE_INTL' | 'ONLY_INTL';
export type FeeTreatment = 'INCLUDE' | 'EXCLUDE_FEE';
export type RewardMerchantMatch = 'CONTAINS' | 'STARTS_WITH' | 'EXACT' | 'REGEX';
export type CapExhaustedBehavior = 'FALL_THROUGH' | 'STOP';
export type DayOfWeek =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type RewardLineReason =
  | 'MATCHED'
  | 'PARTIAL_CAP'
  | 'CAP_EXHAUSTED'
  | 'EXCLUDED_BY_RULE'
  | 'BELOW_SLAB'
  | 'ROUNDED_TO_ZERO'
  | 'TIER_ZERO'
  | 'NO_RULE'
  | 'FULLY_REFUNDED'
  | 'FEE_ONLY'
  | 'TRANSFER_OR_PAYMENT'
  | 'TXN_EXCLUDED';

/** Reason shown as plain colored text (not a badge) — label + a short human explanation for the detail dialog. */
export const REASON_META: Record<RewardLineReason, { label: string; textClass: string; explain: string }> = {
  MATCHED: { label: 'Earned', textClass: 'text-emerald-600 dark:text-emerald-400', explain: 'Earned in full under the matched rule.' },
  PARTIAL_CAP: { label: 'Cap clamped', textClass: 'text-amber-600 dark:text-amber-500', explain: 'Earned, but clamped by a per-transaction or period cap.' },
  CAP_EXHAUSTED: { label: 'Cap exhausted', textClass: 'text-red-500 dark:text-red-400', explain: 'The matched rule’s period cap was already used up.' },
  EXCLUDED_BY_RULE: { label: 'Excluded by rule', textClass: 'text-slate-500 dark:text-slate-400', explain: 'Matched a zero-rate rule — an explicit exclusion.' },
  BELOW_SLAB: { label: 'Below slab', textClass: 'text-slate-500 dark:text-slate-400', explain: 'The spend was smaller than one slab of the matched points rule.' },
  ROUNDED_TO_ZERO: { label: 'Rounds to 0', textClass: 'text-slate-500 dark:text-slate-400', explain: 'The cashback rounded down to zero under the rule’s rounding mode.' },
  TIER_ZERO: { label: 'Tier earns 0', textClass: 'text-slate-500 dark:text-slate-400', explain: 'At the current tier-window spend level, the applicable tier (or its slab) yields zero.' },
  NO_RULE: { label: 'No rule', textClass: 'text-slate-400 dark:text-slate-500', explain: 'No reward rule matched this transaction.' },
  FULLY_REFUNDED: { label: 'Refunded', textClass: 'text-sky-600 dark:text-sky-400', explain: 'Linked refunds reduced the eligible amount to zero.' },
  FEE_ONLY: { label: 'Fee only', textClass: 'text-slate-500 dark:text-slate-400', explain: 'The matched rule excludes convenience fees, and the fee accounted for the whole charge.' },
  TRANSFER_OR_PAYMENT: { label: 'Transfer / payment', textClass: 'text-slate-400 dark:text-slate-500', explain: 'Transfer, card-payment or reversal legs never earn rewards.' },
  TXN_EXCLUDED: { label: 'Txn excluded', textClass: 'text-slate-400 dark:text-slate-500', explain: 'This transaction is marked excluded from analytics.' },
};


/** One marginal-rate tranche; upTo null = open-ended final tranche. rate = % for PERCENT rules, points-per-slab for SLAB rules. */
export interface RewardRuleTier {
  upTo: number | null;
  rate: number;
}

export interface RewardRule {
  id: string;
  accountId: string;
  name: string;
  priority: number;
  stacking: RuleStacking;
  activeFrom?: string | null;
  activeTo?: string | null;
  categories: Category[];
  mccs: string[];
  channels: TransactionChannel[];
  daysOfWeek: DayOfWeek[];
  merchantPattern?: string | null;
  merchantMatch?: RewardMerchantMatch | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  emiTreatment: EmiTreatment;
  intlTreatment: IntlTreatment;
  feeTreatment: FeeTreatment;
  rewardType: RewardType;
  accrualType: AccrualType;
  percentRate?: number | null;
  rounding?: CashbackRounding | null;
  slabSize?: number | null;
  pointsPerSlab?: number | null;
  pointPrecision?: number | null;
  tierWindow?: CapWindow | null;
  tiers?: RewardRuleTier[] | null;
  perTxnCap?: number | null;
  periodCap?: number | null;
  capWindow?: CapWindow | null;
  capBucketId?: string | null;
  capBucketName?: string | null;
  onCapExhausted: CapExhaustedBehavior;
  createdAt: string;
  updatedAt: string;
}

/** Full rule definition — POST creates, PUT overwrites (accountId ignored on PUT). */
export interface RewardRuleRequest {
  accountId?: string;
  name: string;
  priority: number;
  stacking?: RuleStacking;
  activeFrom?: string | null;
  activeTo?: string | null;
  categoryIds?: string[];
  mccs?: string[];
  channels?: TransactionChannel[];
  daysOfWeek?: DayOfWeek[];
  merchantPattern?: string | null;
  merchantMatch?: RewardMerchantMatch | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  emiTreatment?: EmiTreatment;
  intlTreatment?: IntlTreatment;
  /** Unset = INCLUDE — the surcharge earns like the rest of the spend. */
  feeTreatment?: FeeTreatment;
  /** Unset = the account's default reward type. */
  rewardType?: RewardType;
  accrualType: AccrualType;
  percentRate?: number | null;
  rounding?: CashbackRounding | null;
  slabSize?: number | null;
  pointsPerSlab?: number | null;
  pointPrecision?: number | null;
  tierWindow?: CapWindow | null;
  tiers?: RewardRuleTier[] | null;
  perTxnCap?: number | null;
  periodCap?: number | null;
  capWindow?: CapWindow | null;
  capBucketId?: string | null;
  onCapExhausted?: CapExhaustedBehavior;
}

export interface ReorderRewardRulesRequest {
  accountId: string;
  orderedIds: string[];
}

export type MilestoneBasis = 'SPEND' | 'TXN_COUNT';
export type MilestonePayoutType = 'CASH_VALUE' | 'INFO_TRACKER';
/** When an achieved payout lands: the counted window's end, or the crossing date. */
export type MilestonePayoutTiming = 'WINDOW_END' | 'ON_ACHIEVEMENT';
/** Milestone windows exclude DAY; ONE_TIME = a single window spanning the active range. */
export type MilestoneWindow = Exclude<CapWindow, 'DAY'> | 'ONE_TIME';

export interface RewardMilestone {
  id: string;
  accountId: string;
  name: string;
  windowType: MilestoneWindow;
  basis: MilestoneBasis;
  threshold: number;
  minTxnAmount?: number | null;
  payoutType: MilestonePayoutType;
  /** Currency of a CASH_VALUE payout. */
  rewardType: RewardType;
  payoutValue?: number | null;
  payoutTiming: MilestonePayoutTiming;
  includeCategoryIds: string[];
  includeMccs: string[];
  excludeCategoryIds: string[];
  excludeMccs: string[];
  activeFrom?: string | null;
  activeTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Full milestone definition — POST creates, PUT overwrites (accountId ignored on PUT). */
export interface RewardMilestoneRequest {
  accountId?: string;
  name: string;
  windowType: MilestoneWindow;
  basis: MilestoneBasis;
  threshold: number;
  minTxnAmount?: number | null;
  payoutType: MilestonePayoutType;
  /** Unset = the account's default reward type. */
  rewardType?: RewardType;
  payoutValue?: number | null;
  payoutTiming?: MilestonePayoutTiming;
  includeCategoryIds?: string[];
  includeMccs?: string[];
  excludeCategoryIds?: string[];
  excludeMccs?: string[];
  activeFrom?: string | null;
  activeTo?: string | null;
}

/** One milestone × one window instance intersecting the report range. */
export interface MilestoneStatus {
  milestoneId: string;
  name: string;
  windowType: MilestoneWindow;
  windowStart: string;
  windowEnd: string;
  basis: MilestoneBasis;
  threshold: number;
  minTxnAmount?: number | null;
  progress: number;
  achieved: boolean;
  payoutType: MilestonePayoutType;
  rewardType: RewardType;
  payoutValue?: number | null;
  /** The single date the payout is attributed to; null while unachieved. */
  payoutDate?: string | null;
  countedInSummary: boolean;
}

export interface RewardCapBucket {
  id: string;
  accountId: string;
  name: string;
  cap: number;
  rewardType: RewardType;
  windowType: CapWindow;
  ruleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RewardCapBucketRequest {
  accountId?: string;
  name: string;
  cap: number;
  /** Unit of the cap; only rules of this reward type can share the bucket. */
  rewardType?: RewardType;
  windowType: CapWindow;
}

export interface RewardCapStatus {
  window: CapWindow;
  cap: number;
  used: number;
  windowStart: string;
  windowEnd: string;
  cycleFallback: boolean;
  /** Non-null when this cap is a bucket shared by several rules. */
  sharedBucket?: string | null;
}

export interface RewardRuleBreakdown {
  ruleId: string;
  name: string;
  stacking: RuleStacking;
  accrualType: AccrualType;
  activeInRange: boolean;
  matchedCount: number;
  basisMatched: number;
  earned: number;
  earnedUnit: 'RUPEES' | 'POINTS';
  capStatus?: RewardCapStatus | null;
}

/** ₹ totals and percentages cover cash value only — points are reported as points. */
export interface RewardSummary {
  basisSpend: number;
  transactionCount: number;
  matchedCount: number;
  cashbackInr: number;
  points: number;
  milestonesInr: number;
  /** Points paid by points-currency milestones (not in the ₹ totals). */
  milestonesPts: number;
  grossValueInr: number;
  discounts: number;
  fees: number;
  effectiveValueInr: number;
  grossPct?: number | null;
  effectivePct?: number | null;
}

export interface RewardReport {
  summary: RewardSummary;
  rules: RewardRuleBreakdown[];
  milestones: MilestoneStatus[];
  cycleFallback: boolean;
  anniversaryFallback: boolean;
}

export interface RewardLine {
  transactionId: string;
  transactionDate: string;
  effectiveDate: string;
  description?: string | null;
  sourcedDescription?: string | null;
  mcc?: string | null;
  channel?: TransactionChannel | null;
  amount: number;
  basis: number;
  ruleId?: string | null;
  ruleName?: string | null;
  stacking?: RuleStacking | null;
  accrualType?: AccrualType | null;
  earned: number;
  earnedUnit: 'RUPEES' | 'POINTS';
  reason: RewardLineReason;
}

export type PagedRewardLines = Page<RewardLine>;

export interface RewardRecommendationRequest {
  amount: number;
  date?: string;
  categoryIds?: string[];
  mcc?: string;
  merchantText?: string;
  channel?: TransactionChannel;
  isEmi?: boolean;
  isIntl?: boolean;
  accountIds?: string[];
}

export interface SimulatedCapStatus {
  capWindow: CapWindow;
  totalCap: number;
  usedBefore: number;
  capRemainingBefore: number;
  windowEnd?: string;
  bucketName?: string | null;
}

export interface SimulatedRuleLine {
  ruleId?: string | null;
  ruleName?: string | null;
  stacking?: RuleStacking | null;
  earned: number;
  earnedUnit: 'RUPEES' | 'POINTS';
  earnedValueInr: number;
  reason: RewardLineReason;
  capStatus?: SimulatedCapStatus | null;
}

export interface SimulatedMilestone {
  milestoneId: string;
  name: string;
  windowEnd: string;
  progress: number;
  threshold: number;
  remainingToThreshold: number;
  crosses: boolean;
  payoutInr?: number | null;
  scoredValueInr: number;
  payoutType: MilestonePayoutType;
}

export interface RewardCardRecommendation {
  accountId: string;
  accountName: string;
  rank: number;
  totalValueInr: number;
  guaranteedValueInr: number;
  milestoneValueInr: number;
  effectiveRatePct: number;
  /** Whether the card has its own point valuation or fell back to the default. */
  pointValueSource: 'CONFIG' | 'DEFAULT';
  pointValueInr: number;
  /** True when points were actually converted to ₹ — a DEFAULT valuation only misleads then. */
  pointsValued: boolean;
  ruleLines: SimulatedRuleLine[];
  milestones: SimulatedMilestone[];
  noRulesConfigured: boolean;
  cycleFallback: boolean;
  anniversaryFallback: boolean;
}

export interface RewardRecommendationResponse {
  input: RewardRecommendationRequest;
  recommendations: RewardCardRecommendation[];
}

