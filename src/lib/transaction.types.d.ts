import { Category } from '@/lib/categories.types';
import { FilterClause } from '@/lib/reports.types';

export interface TransactionSearchRequest {
  filters: FilterClause[];
  search?: string | null;
}

export type TransactionSource = 'gmail_transaction_alert' | 'gmail_statement' | 'manual';

export type ReviewType = 'NEEDS_REVIEW' | 'AUTO_REVIEWED' | 'MANUALLY_REVIEWED';

export interface TransactionBase {
  accountId: string;
  date: string;
  amount: number;
  description?: string;
  isTransactionExcluded?: boolean;
  isTransactionUnderMonitoring?: boolean;
  source: TransactionSource;
  reviewType?: ReviewType;
}

export type TransactionRequest = TransactionBase & {
  categoryIds: string[];
}

export type Transaction = TransactionBase & {
  id: string;
  createdAt: string;
  balance: number;
  categories?: Category[];
  sourcedDescription: string;
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