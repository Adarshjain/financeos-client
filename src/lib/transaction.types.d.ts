import { Category } from '@/lib/categories.types';

export type TransactionSource = 'gmail' | 'manual';

export interface TransactionBase {
  accountId: string;
  date: string;
  amount: number;
  description?: string;
  source: TransactionSource;
  metadata?: Record<string, unknown>;
  isTransactionExcluded: boolean;
  isTransactionUnderMonitoring: boolean;
}

export type TransactionRequest = TransactionBase & {
  categoryIds: string[];
}

export type Transaction = TransactionBase & {
  id: string;
  createdAt: string;
  balance: number;
  categories?: Category[];
  sourceDescription: string;
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