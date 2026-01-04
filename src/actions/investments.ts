'use server';

import { revalidatePath } from 'next/cache';

import { ApiError,investmentsApi } from '@/lib/api-client';
import type {
  ApiResult,
  InvestmentTransactionResponse,
  InvestmentTransactionType,
} from '@/lib/types';

export async function createInvestmentTransaction(
  _prevState: ApiResult<InvestmentTransactionResponse> | null,
  formData: FormData
): Promise<ApiResult<InvestmentTransactionResponse>> {
  const accountId = formData.get('accountId') as string;
  const type = formData.get('type') as InvestmentTransactionType;
  const quantity = formData.get('quantity') as string;
  const price = formData.get('price') as string;
  const date = formData.get('date') as string;

  if (!accountId || !type || !quantity || !price || !date) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'All fields are required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const transaction = await investmentsApi.createTransaction({
      accountId,
      type,
      quantity,
      price,
      date,
    });
    revalidatePath('/investments');
    return { success: true, data: transaction };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to create investment transaction',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
