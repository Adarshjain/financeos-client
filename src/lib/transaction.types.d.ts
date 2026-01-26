export type TransactionSource = 'gmail' | 'manual';

export interface TransactionRequest {
  accountId: string;
  date: string;
  amount: number;
  description: string;
  categories?: string[];
  source: TransactionSource;
  metadata?: Record<string, unknown>;
  notes?: string;
}

export type Transaction = TransactionRequest & {
  id: string;
  createdAt: string;
  balance: number;
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