import { Category } from '@/lib/categories.types';
import type { Page } from '@/lib/pagination';
import { FilterClause } from '@/lib/reports.types';

export interface TransactionSearchRequest {
  filters: FilterClause[];
  search?: string | null;
}

export type TransactionSource = 'gmail_transaction_alert' | 'gmail_statement' | 'manual' | 'file_upload';

export type ReviewType = 'NEEDS_REVIEW' | 'AUTO_REVIEWED' | 'MANUALLY_REVIEWED' | 'NA';

export type ReviewReason = 'UNRECONCILED' | 'CATEGORY_UNVERIFIED' | 'DUPLICATE_SUSPECT' | 'OTHER';

export type TransactionChannel = 'ONLINE' | 'POS' | 'UPI' | 'CONTACTLESS' | 'OTHER';

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
  date: string;
  amount: number;
  description?: string;
  isTransactionExcluded?: boolean;
  isTransactionUnderMonitoring?: boolean;
  monitoringReason?: string;
  mcc?: string | null;
  source: TransactionSource;
  reviewType?: ReviewType;
}

export type TransactionRequest = Omit<TransactionBase, 'source' | 'reviewType'> & {
  categoryIds: string[];
  source?: TransactionSource;
  reviewType?: ReviewType;
  rewardDetails?: RewardDetails;
}

export type LinkType = 'TRANSFER' | 'CC_PAYMENT' | 'REFUND' | 'REVERSAL' | 'FEE' | 'EMI';

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
  signedAmount: number;
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

export type Transaction = TransactionBase & {
  id: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string | null;
  balance: number | null;
  categories?: Category[];
  sourcedDescription: string;
  reviewReasons?: ReviewReason[];
  appliedRuleId?: string | null;
  links?: TransactionLinkSummary[];
  // Reward details come back flat on the response (requests nest them in rewardDetails)
  settlementDate?: string | null;
  instantDiscount?: number | null;
  convenienceFee?: number | null;
  channel?: TransactionChannel | null;
  isEmi?: boolean | null;
  isInternational?: boolean | null;
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