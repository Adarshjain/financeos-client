'use server';

import { revalidatePath } from 'next/cache';

import { ApiError, transactionsApi } from '@/lib/apiClient';
import type { PagedTransaction, ReviewType,Transaction, TransactionRequest, TransactionSearchRequest } from '@/lib/transaction.types';
import type { ApiResult, ErrorResponse } from '@/lib/types';

function handleTransactionError(error: unknown, defaultMessage: string): { success: false; error: ErrorResponse } {
  if (error instanceof ApiError) {
    return { success: false, error: error.response };
  }
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: defaultMessage,
      timestamp: new Date().toISOString(),
    },
  };
}

export async function createTransaction(
  transactionRequest: TransactionRequest,
): Promise<ApiResult<Transaction>> {
  try {
    const transaction = await transactionsApi.create(transactionRequest);
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data: transaction };
  } catch (error) {
    return handleTransactionError(error, 'Failed to create transaction');
  }
}

export async function updateTransaction(
  transactionId: string,
  transactionRequest: TransactionRequest,
): Promise<ApiResult<Transaction>> {
  try {
    const transaction = await transactionsApi.update(transactionId, transactionRequest);
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data: transaction };
  } catch (error) {
    return handleTransactionError(error, 'Failed to update transaction');
  }
}

export async function deleteTransaction(
  transactionId: string,
): Promise<ApiResult<void>> {
  try {
    await transactionsApi.delete(transactionId);
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data: undefined };
  } catch (error) {
    return handleTransactionError(error, 'Failed to delete transaction');
  }
}

export async function searchTransactions(
  body: TransactionSearchRequest,
  page = 0,
  size = 50,
  sort = 'date,desc',
): Promise<ApiResult<PagedTransaction>> {
  try {
    const transactions = await transactionsApi.search(body, page, size, sort);
    return { success: true, data: transactions };
  } catch (error) {
    return handleTransactionError(error, 'Failed to search transactions');
  }
}

export async function batchReviewTransactions(
  transactionIds: string[],
  reviewType: ReviewType,
): Promise<ApiResult<{ updated: number }>> {
  try {
    const data = await transactionsApi.batchReview({ transactionIds, reviewType });
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data };
  } catch (error) {
    return handleTransactionError(error, 'Failed to batch review transactions');
  }
}

export async function batchDeleteTransactions(
  transactionIds: string[],
): Promise<ApiResult<{ deleted: number }>> {
  try {
    const data = await transactionsApi.batchDelete({ transactionIds });
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data };
  } catch (error) {
    return handleTransactionError(error, 'Failed to batch delete transactions');
  }
}