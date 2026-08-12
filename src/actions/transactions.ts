'use server';

import { transactionsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { ReviewReason, ReviewType, TransactionRequest, TransactionSearchRequest } from '@/lib/transaction.types';

const TRANSACTION_PATHS = ['/transactions', '/transactions/review'];

export const createTransaction = createDomainAction(
  { fallbackError: 'Failed to create transaction', revalidatePaths: TRANSACTION_PATHS },
  (transactionRequest: TransactionRequest) => transactionsApi.create(transactionRequest)
);

export const updateTransaction = createDomainAction(
  { fallbackError: 'Failed to update transaction', revalidatePaths: TRANSACTION_PATHS },
  (transactionId: string, transactionRequest: TransactionRequest) => transactionsApi.update(transactionId, transactionRequest)
);

export const deleteTransaction = createDomainAction(
  { fallbackError: 'Failed to delete transaction', revalidatePaths: TRANSACTION_PATHS },
  (transactionId: string) => transactionsApi.delete(transactionId)
);

export const searchTransactions = createDomainAction(
  { fallbackError: 'Failed to search transactions' },
  (body: TransactionSearchRequest, page = 0, size = 50, sort = 'date,desc') =>
    transactionsApi.search(body, page, size, sort)
);

export const batchReviewTransactions = createDomainAction(
  { fallbackError: 'Failed to batch review transactions', revalidatePaths: TRANSACTION_PATHS },
  (transactionIds: string[], reviewType: ReviewType, reviewReasons?: ReviewReason[]) =>
    transactionsApi.batchReview({ transactionIds, reviewType, reviewReasons })
);

export const batchDeleteTransactions = createDomainAction(
  { fallbackError: 'Failed to batch delete transactions', revalidatePaths: TRANSACTION_PATHS },
  (transactionIds: string[]) => transactionsApi.batchDelete({ transactionIds })
);
