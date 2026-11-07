import type { Schemas } from '@/lib/api/types';
import type { CategoryRef, CategorySource, SubcategoryRef } from '@/lib/categoryList.types';
import type { Page } from '@/lib/pagination';
import { FilterClause } from '@/lib/reports.types';
import type { Tag } from '@/lib/tags.types';

export interface TransactionSearchRequest {
  filters: FilterClause[];
  search?: string | null;
}

export type TransactionSource = 'gmail_transaction_alert' | 'gmail_statement' | 'manual' | 'file_upload';

export type ReviewType = 'NEEDS_REVIEW' | 'AUTO_REVIEWED' | 'MANUALLY_REVIEWED' | 'NA';

export type ReviewReason = 'UNRECONCILED' | 'DUPLICATE_SUSPECT' | 'DATE_CORRECTED' | 'NOT_ON_STATEMENT';

export type TransactionChannel = 'ONLINE' | 'POS' | 'UPI' | 'CONTACTLESS' | 'ATM' | 'OTHER';

/**
 * Reward-relevant transaction details. Overwrite semantics on save: when this
 * object is present on a create/update request ALL six fields are applied
 * (nulls clear); when absent the stored values are left untouched.
 */
export interface RewardDetails {
  settlementDate?: string | null;
  instantDiscount?: number | null;
  convenienceFee?: number | null;
  channel?: TransactionChannel | null;
  isEmi?: boolean | null;
  isInternational?: boolean | null;
}

export interface TransactionBase {
  accountId: string;
  cardId?: string | null;
  date: string;
  amount: number;
  description?: string | null;
  isTransactionExcluded?: boolean;
  isTransactionUnderMonitoring?: boolean;
  monitoringReason?: string | null;
  mcc?: string | null;
  source: TransactionSource;
  reviewType?: ReviewType | null;
}

export type TransactionRequest = Omit<TransactionBase, 'source' | 'reviewType' | 'amount'> & {
  /** Null only when editing a transaction whose stored amount is null. */
  amount: number | null;
  tagIds: string[];
  /** Create: the category to set. Update: send only when the user changed it; an edit never re-categorises. */
  categoryKey?: string;
  subcategoryKey?: string;
  source?: TransactionSource;
  reviewType?: ReviewType;
  /** Update only, with reviewType NEEDS_REVIEW: exactly these reasons. Omitted keeps the stored ones. */
  reviewReasons?: ReviewReason[];
  rewardDetails?: RewardDetails;
}

export type LinkType = 'TRANSFER' | 'CC_PAYMENT' | 'REFUND' | 'REVERSAL' | 'FEE' | 'EMI';

/**
 * The full set of things the "Link" dialog can create from a transaction: the
 * existing transaction<->transaction link types, plus two "record" kinds that
 * fold what used to be a separate "Record as lending" flow (and a new loan-EMI
 * settlement flow) into the same entry point.
 */
export type LinkKind = LinkType | 'LENDING' | 'LOAN_PAYMENT' | 'DIVIDEND' | 'EPF_WITHDRAWAL';

/** The `LinkKind` values that are not a `LinkType` — they don't hit `/transaction-links`. */
export const RECORD_LINK_KINDS = ['LENDING', 'LOAN_PAYMENT', 'DIVIDEND', 'EPF_WITHDRAWAL'] as const;

export function isRecordKind(kind: LinkKind): kind is (typeof RECORD_LINK_KINDS)[number] {
  return (RECORD_LINK_KINDS as readonly string[]).includes(kind);
}

export type LinkOrigin = 'USER' | 'AUTO' | 'IMPORT';

export interface MemberRef {
  transactionId: string;
  isAnchor: boolean;
}

export interface CreateTransactionLinkRequest {
  type: LinkType;
  note?: string | null;
  alignRefundCategories?: boolean;
  members: MemberRef[];
}

export interface MemberSummary {
  transactionId: string;
  date: string;
  signedAmount?: number | null;
  description?: string;
  accountId: string;
  isAnchor: boolean;
  roleLabel: string;
}

export interface TransactionLinkResponse {
  id: string;
  type: LinkType;
  note?: string | null;
  createdBy: LinkOrigin;
  createdAt: string;
  members: MemberSummary[];
}

export interface TransactionLinkSummary {
  linkId: string;
  type: LinkType;
  roleLabel: string;
  memberCount: number;
}

export type ObligationKind = 'LENDING' | 'LOAN_PAYMENT' | 'LOAN_EVENT' | 'LOAN_CHARGE' | 'DIVIDEND' | 'EPF_WITHDRAWAL' | 'NPS_CONTRIBUTION';

/**
 * A direct-FK reference from a lending ledger entry, loan row or dividend row
 * back to this transaction. `parentId` is the id the badge should link to: a
 * counterparty (`/lending/{parentId}`) for LENDING, an instrument
 * (`/investments/activity/dividends?instrumentId={parentId}`) for DIVIDEND, a loan
 * (`/loans/{parentId}`) otherwise.
 */
export interface ObligationRef {
  kind: ObligationKind;
  id: string;
  parentId?: string | null;
  label: string;
  amount?: number | null;
  /** Who made the link: AUTO shows "Linked automatically". */
  origin?: LinkOrigin;
}

/** The statement a NOT_ON_STATEMENT transaction is missing from; the periods are null when an endpoint sends the id only. */
export interface NotOnStatement {
  statementId: string;
  periodStart?: string | null;
  periodEnd?: string | null;
}

export type Transaction = Omit<TransactionBase, 'amount'> & {
  id: string;
  /** Null for a foreign charge still waiting for its statement: see originalAmount / originalCurrency. */
  amount: number | null;
  originalAmount?: number | null;
  originalCurrency?: string | null;
  notOnStatement?: NotOnStatement | null;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string | null;
  balance?: number | null;
  /** The bank's printed balance, only on the first row where our running balance stops matching it (same sign as balance). */
  bankBalance?: number | null;
  category?: CategoryRef | null;
  subcategory?: SubcategoryRef | null;
  categorySource?: CategorySource | null;
  categoryRule?: { id: string; name?: string | null } | null;
  categorySetAt?: string | null;
  tags?: Tag[];
  sourcedDescription?: string | null;
  reviewReasons?: ReviewReason[];
  appliedRuleId?: string | null;
  links?: TransactionLinkSummary[];
  /** A link the server proposes for this transaction; null when none. */
  suggestion?: Schemas['TransactionSuggestion'] | null;
  obligationRefs?: ObligationRef[];
  cardId?: string | null;
  cardLabel?: string | null;
  /** Last 4 digits of the plastic the spend happened on. */
  cardLast4?: string | null;
  // Reward details come back flat on the response (requests nest them in rewardDetails)
  settlementDate?: string | null;
  instantDiscount?: number | null;
  convenienceFee?: number | null;
  channel?: TransactionChannel | null;
  isEmi?: boolean | null;
  isInternational?: boolean | null;
}

/**
 * Field names mirror the server record `BulkReattributeCardRequest` exactly
 * (`accountId, cardId, from, to, currentCardId`). They previously read
 * `targetCardId`/`fromDate`/`toDate`, which never matched the API — the mismatch
 * went unnoticed because nothing consumed these types until the CardsDialog
 * reassign flow landed. Renaming the *caller* to match these names instead would
 * compile and then silently no-op, since the server would receive nulls.
 */
export interface BulkReattributeCardRequest {
  accountId: string;
  /** Target card; omit to clear attribution (set to Unattributed). */
  cardId?: string | null;
  from?: string | null;
  to?: string | null;
  /** Restrict to transactions currently on this card. */
  currentCardId?: string | null;
}

export interface BulkReattributeResponse {
  updatedCount: number;
}

export type PagedTransaction = Page<Transaction>;

export interface BatchReviewRequest {
  transactionIds: string[];
  reviewType: ReviewType;
  reviewReasons?: ReviewReason[];
}

export interface BatchFailure {
  id: string;
  reason: string;
}

export interface BatchReviewResponse {
  succeededIds: string[];
  skippedIds: string[];
  failures: BatchFailure[];
}

export interface BatchDeleteRequest {
  transactionIds: string[];
}

export interface BatchDeleteResponse {
  succeededIds: string[];
  failures: BatchFailure[];
}

export interface MergeTransactionsRequest {
  keepId: string;
  deleteId: string;
}

export interface MergeTransactionsResponse {
  keptId: string;
  reviewType: ReviewType;
  remainingReasons: ReviewReason[];
}

/** The category fields a transaction had before a change: PUT …/category sends them back as `restore` for Undo. */
export interface CategoryRestore {
  source?: CategorySource | null;
  ruleId?: string | null;
  setAt?: string | null;
}

export interface SetCategoryRequest {
  categoryKey: string | null;
  subcategoryKey: string | null;
  restore?: CategoryRestore;
}

export interface SetCategoryResponse {
  transactionId: string;
  category?: CategoryRef | null;
  subcategory?: SubcategoryRef | null;
  categorySource?: CategorySource | null;
  categoryRuleId?: string | null;
  categorySetAt?: string | null;
  isTransactionExcluded: boolean;
  /** The short payee key a "do the same next time" rule would match; null when none. */
  ruleKey?: string | null;
  previous: {
    categoryKey?: string | null;
    subcategoryKey?: string | null;
    source?: CategorySource | null;
    ruleId?: string | null;
    setAt?: string | null;
  };
}

/** POST /categorize: both keys are null when nothing matched. */
export interface CategorizeResponse {
  categoryKey?: string | null;
  subcategoryKey?: string | null;
  source?: string | null;
}
