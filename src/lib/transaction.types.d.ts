import { Category } from '@/lib/categories.types';
import { FilterClause } from '@/lib/reports.types';

export interface TransactionSearchRequest {
  filters: FilterClause[];
  search?: string | null;
}

export type TransactionSource = 'gmail_transaction_alert' | 'gmail_statement' | 'manual' | 'file_upload';

export type ReviewType = 'NEEDS_REVIEW' | 'AUTO_REVIEWED' | 'MANUALLY_REVIEWED' | 'NA';

export type ReviewReason = 'UNRECONCILED' | 'CATEGORY_UNVERIFIED' | 'DUPLICATE_SUSPECT';

export interface TransactionBase {
  accountId: string;
  date: string;
  amount: number;
  description?: string;
  isTransactionExcluded?: boolean;
  isTransactionUnderMonitoring?: boolean;
  monitoringReason?: string;
  source: TransactionSource;
  reviewType?: ReviewType;
}

export type TransactionRequest = Omit<TransactionBase, 'source' | 'reviewType'> & {
  categoryIds: string[];
  source?: TransactionSource;
  reviewType?: ReviewType;
}

export type Transaction = TransactionBase & {
  id: string;
  createdAt: string;
  balance: number | null;
  categories?: Category[];
  sourcedDescription: string;
  reviewReasons?: ReviewReason[];
  appliedRuleId?: string | null;
}

export interface PagedTransaction {
  content: Transaction[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

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