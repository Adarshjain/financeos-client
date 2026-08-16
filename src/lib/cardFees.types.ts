export enum CardFeeKind {
  LTF = 'LTF',
  ANNUAL_FEE = 'ANNUAL_FEE',
  JOINING_FEE = 'JOINING_FEE',
}

export enum FeeWaiverBasis {
  PRECEDING_FEE_YEAR = 'PRECEDING_FEE_YEAR',
  SAME_FEE_YEAR = 'SAME_FEE_YEAR',
}

export enum FeeWaiverSource {
  NONE = 'NONE',
  AUTO_SPEND = 'AUTO_SPEND',
  MANUAL = 'MANUAL',
  LINKED_CHARGE = 'LINKED_CHARGE',
}

export enum FeeOccurrenceStatus {
  LIFETIME_FREE = 'LIFETIME_FREE',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  DUE = 'DUE',
  WAIVED_AUTO = 'WAIVED_AUTO',
  WAIVED_MANUAL = 'WAIVED_MANUAL',
  CHARGED_MANUAL = 'CHARGED_MANUAL',
  SUPPRESSED_CLOSED = 'SUPPRESSED_CLOSED',
}

export interface CardFeeTerm {
  id: string;
  accountId: string;
  kind: CardFeeKind;
  effectiveFrom: string;
  amount?: number | null;
  gstRate?: number | null;
  totalAmount?: number | null;
  waiverSpendThreshold?: number | null;
  waiverBasis?: FeeWaiverBasis | null;
  note?: string | null;
  firstGovernedFeeYearStart: string;
}

export interface CardFeeTermRequest {
  accountId: string;
  kind: CardFeeKind;
  effectiveFrom: string;
  amount?: number | null;
  gstRate?: number | null;
  waiverSpendThreshold?: number | null;
  waiverBasis?: FeeWaiverBasis | null;
  note?: string | null;
}

export interface CardFeeCharge {
  id: string;
  accountId: string;
  kind: CardFeeKind;
  feeYearStart: string;
  waived?: boolean | null;
  overrideAmount?: number | null;
  transactionIds: string[];
  note?: string | null;
}

export interface CardFeeChargeRequest {
  accountId: string;
  kind: CardFeeKind;
  feeYearStart: string;
  waived?: boolean | null;
  overrideAmount?: number | null;
  transactionIds?: string[];
  note?: string | null;
}

export interface FeeChargeCandidate {
  transactionId: string;
  date: string;
  description: string;
  sourcedDescription?: string | null;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  amountDelta: number;
}

export interface FeeOccurrence {
  kind: CardFeeKind;
  status: FeeOccurrenceStatus;
  feeYearStart: string;
  feeYearEnd: string;
  amortiseFrom: string;
  amortiseTo: string;
  dueDate: string;
  baseAmount?: number | null;
  gstRate?: number | null;
  gstAmount?: number | null;
  totalAmount?: number | null;
  waiverSpendThreshold?: number | null;
  waiverBasis?: FeeWaiverBasis | null;
  waiverWindowStart?: string | null;
  waiverWindowEnd?: string | null;
  spendConsidered?: number | null;
  waived?: boolean | null;
  waiverSource?: FeeWaiverSource | null;
  provisional?: boolean | null;
  waiverSpendIncomplete?: boolean | null;
  waiverContradictsLinkedCharge?: boolean | null;
  netAmount: number;
  amortisedInRange: number;
  amortisedToDate: number;
  transactionIds: string[];
  note?: string | null;
}

export interface CardFeeSchedule {
  occurrences: FeeOccurrence[];
  totalAmortisedInRange: number;
  totalAmortisedToDate: number;
  unanchoredFees: boolean;
  unlinkedFeeCharges: boolean;
  waiverSpendIncomplete: boolean;
  notConfiguredFeeYears: boolean;
  orphanedFeeOverrides: string[];
}

export const FEE_STATUS_META: Record<
  FeeOccurrenceStatus,
  { label: string; badgeClass: string; textClass: string; description: string }
> = {
  [FeeOccurrenceStatus.LIFETIME_FREE]: {
    label: 'Lifetime Free',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'This card carries no annual fee under its current term.',
  },
  [FeeOccurrenceStatus.NOT_CONFIGURED]: {
    label: 'Not Configured',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    textClass: 'text-slate-500 dark:text-slate-400',
    description: 'No fee term was in force at the start of this fee year.',
  },
  [FeeOccurrenceStatus.DUE]: {
    label: 'Fee Due',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    textClass: 'text-amber-600 dark:text-amber-400',
    description: 'Annual fee is applicable and spend threshold was not met.',
  },
  [FeeOccurrenceStatus.WAIVED_AUTO]: {
    label: 'Waived (Spend Met)',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'Fee auto-waived because eligible spend crossed the threshold.',
  },
  [FeeOccurrenceStatus.WAIVED_MANUAL]: {
    label: 'Waived (Manual)',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Fee manually marked waived (e.g., retention offer).',
  },
  [FeeOccurrenceStatus.CHARGED_MANUAL]: {
    label: 'Charged',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    textClass: 'text-rose-600 dark:text-rose-400',
    description: 'Fee charged by issuer (manually set or linked transaction).',
  },
  [FeeOccurrenceStatus.SUPPRESSED_CLOSED]: {
    label: 'Suppressed (Closed)',
    badgeClass: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400',
    textClass: 'text-zinc-500 dark:text-zinc-400',
    description: 'Fee year starts after account closure date.',
  },
};

export function feeAllIn(amount: number | null | undefined, gstRate: number | null | undefined): number {
  if (amount == null || amount <= 0) return 0;
  const rate = gstRate ?? 18;
  return Math.round((amount + (amount * rate) / 100) * 100) / 100;
}
