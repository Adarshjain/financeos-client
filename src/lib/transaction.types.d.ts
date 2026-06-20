import { Category } from '@/lib/categories.types';

export type TransactionSource = 'gmail' | 'manual';

export interface TransactionBase {
  accountId: string;
  date: string;
  amount: number;
  description?: string;
  isTransactionExcluded?: boolean;
  isTransactionUnderMonitoring?: boolean;
  source: TransactionSource;
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