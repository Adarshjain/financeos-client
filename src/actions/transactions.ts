'use server';

import { revalidatePath } from 'next/cache';

import { ApiError, transactionsApi } from '@/lib/apiClient';
import type { Transaction, TransactionRequest, TransactionSource } from '@/lib/transaction.types';
import type { ApiResult, ErrorResponse } from '@/lib/types';


function buildTransactionRequest(
  formData: FormData,
): { success: true; data: TransactionRequest } | { success: false; error: ErrorResponse } {
  const accountId = formData.get('accountId') as string | undefined;
  const date = formData.get('date') as string | undefined;
  const amount = parseInt(formData.get('amount') as string | undefined ?? '0', 10) as number;
  const description = formData.get('description') as string;
  const category = JSON.parse(formData.get('category') as string | undefined ?? '[]') as string[];
  const source = (formData.get('source') ?? 'manual') as TransactionSource;
  const notes = formData.get('notes') as string | undefined;


  if (!accountId || !date || !amount || !description) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Fields Missing!',
        timestamp: new Date().toISOString(),
      },
    };
  }

  let data: TransactionRequest = {
    accountId,
    date,
    amount,
    description,
    categories: category,
    source,
    notes,
  };

  return { success: true, data };
}

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
  _prevState: ApiResult<Transaction> | null,
  formData: FormData,
): Promise<ApiResult<Transaction>> {
  const requestResult = buildTransactionRequest(formData);
  if (!requestResult.success) {
    return requestResult;
  }

  try {
    const transaction = await transactionsApi.create(requestResult.data);
    revalidatePath('/transactions');
    return { success: true, data: transaction };
  } catch (error) {
    return handleTransactionError(error, 'Failed to create transaction');
  }
}

export async function updateTransaction(
  transactionId: string,
  _prevState: ApiResult<Transaction> | null,
  formData: FormData,
): Promise<ApiResult<Transaction>> {
  const requestResult = buildTransactionRequest(formData);
  if (!requestResult.success) {
    return requestResult;
  }

  try {
    const transaction = await transactionsApi.update(transactionId, requestResult.data);
    revalidatePath('/transactions');
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
    return { success: true, data: undefined };
  } catch (error) {
    return handleTransactionError(error, 'Failed to delete transaction');
  }
}