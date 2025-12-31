'use server';

import { revalidatePath } from 'next/cache';
import { transactionsApi, ApiError } from '@/lib/api-client';
import type { ApiResult, TransactionResponse, TransactionSource } from '@/lib/types';

export async function createTransaction(
  _prevState: ApiResult<TransactionResponse> | null,
  formData: FormData
): Promise<ApiResult<TransactionResponse>> {
  const accountId = formData.get('accountId') as string | undefined;
  const date = formData.get('date') as string;
  const amount = formData.get('amount') as string;
  const description = formData.get('description') as string;
  const category = formData.get('category') as string | undefined;
  const subcategory = formData.get('subcategory') as string | undefined;
  const spentFor = formData.get('spentFor') as string | undefined;
  const source = (formData.get('source') as TransactionSource) || 'manual';

  if (!date || !amount || !description) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Date, amount, and description are required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const transaction = await transactionsApi.create({
      accountId: accountId || undefined,
      date,
      amount,
      description,
      category: category || undefined,
      subcategory: subcategory || undefined,
      spentFor: spentFor || undefined,
      source,
    });
    revalidatePath('/transactions');
    return { success: true, data: transaction };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to create transaction',
        timestamp: new Date().toISOString(),
      },
    };
  }
}


