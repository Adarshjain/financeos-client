import { Category } from '@/lib/categories.types';

export type TransactionSource = 'gmail' | 'manual';

export interface TransactionBase {
  accountId: string;
  date: string;
  amount: number;
  description?: string;
  isTransactionExcluded?: boolean;
  isTransactionUnderMonitoring?: boolean;
}

export type TransactionRequest = TransactionBase & {
  categoryIds: string[];
  source?: TransactionSource;
}

export type Transaction = TransactionBase & {
  id: string;
  createdAt: string;
  balance: number;
  categories?: Category[];
  sourceDescription: string;
  source: TransactionSource;
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