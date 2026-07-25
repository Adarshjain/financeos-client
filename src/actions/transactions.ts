'use server';

import { revalidatePath } from 'next/cache';

import { transactionsApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type { BatchDeleteResponse, BatchReviewResponse, PagedTransaction, ReviewReason, ReviewType, Transaction, TransactionRequest, TransactionSearchRequest } from '@/lib/transaction.types';
import type { ApiResult } from '@/lib/types';

/** Routes whose data depends on the transaction list. */
function revalidateTransactionViews(): void {
  revalidatePath('/transactions');
  revalidatePath('/transactions/review');
}

export async function createTransaction(
  transactionRequest: TransactionRequest,
): Promise<ApiResult<Transaction>> {
  return apiResult('Failed to create transaction', async () => {
    const transaction = await transactionsApi.create(transactionRequest);
    revalidateTransactionViews();
    return transaction;
  });
}

export async function updateTransaction(
  transactionId: string,
  transactionRequest: TransactionRequest,
): Promise<ApiResult<Transaction>> {
  return apiResult('Failed to update transaction', async () => {
    const transaction = await transactionsApi.update(transactionId, transactionRequest);
    revalidateTransactionViews();
    return transaction;
  });
}

export async function deleteTransaction(
  transactionId: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete transaction', async () => {
    await transactionsApi.delete(transactionId);
    revalidateTransactionViews();
  });
}

export async function searchTransactions(
  body: TransactionSearchRequest,
  page = 0,
  size = 50,
  sort = 'date,desc',
): Promise<ApiResult<PagedTransaction>> {
  return apiResult('Failed to search transactions', () =>
    transactionsApi.search(body, page, size, sort),
  );
}

export async function batchReviewTransactions(
  transactionIds: string[],
  reviewType: ReviewType,
  reviewReasons?: ReviewReason[],
): Promise<ApiResult<BatchReviewResponse>> {
  return apiResult('Failed to batch review transactions', async () => {
    const data = await transactionsApi.batchReview({ transactionIds, reviewType, reviewReasons });
    revalidateTransactionViews();
    return data;
  });
}

export async function batchDeleteTransactions(
  transactionIds: string[],
): Promise<ApiResult<BatchDeleteResponse>> {
  return apiResult('Failed to batch delete transactions', async () => {
    const data = await transactionsApi.batchDelete({ transactionIds });
    revalidateTransactionViews();
    return data;
  });
}
