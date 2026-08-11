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
}

/** PUT body — only the default reward type is editable via reward config. */
export interface RewardAccountConfigRequest {
  accountId: string;
  defaultRewardType: RewardType;
}
export type EmiTreatment = 'INCLUDE' | 'EXCLUDE_EMI' | 'ONLY_EMI';
export type IntlTreatment = 'INCLUDE' | 'EXCLUDE_INTL' | 'ONLY_INTL';
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
  | 'TRANSFER_OR_PAYMENT'
  | 'TXN_EXCLUDED';

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
