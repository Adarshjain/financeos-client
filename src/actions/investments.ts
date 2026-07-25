'use server';

import { revalidatePath } from 'next/cache';

import { investmentsApi } from '@/lib/apiClient';
import { apiResult, validationError } from '@/lib/apiResult';
import { optionalString } from '@/lib/forms';
import type {
  ApiResult,
  InvestmentTransactionResponse,
  InvestmentTransactionType,
} from '@/lib/types';

export async function createInvestmentTransaction(
  _prevState: ApiResult<InvestmentTransactionResponse> | null,
  formData: FormData
): Promise<ApiResult<InvestmentTransactionResponse>> {
  const accountId = optionalString(formData, 'accountId');
  const type = optionalString(formData, 'type') as InvestmentTransactionType | undefined;
  const quantity = optionalString(formData, 'quantity');
  const price = optionalString(formData, 'price');
  const date = optionalString(formData, 'date');

  if (!accountId || !type || !quantity || !price || !date) {
    return validationError('All fields are required');
  }

  return apiResult('Failed to create investment transaction', async () => {
    const transaction = await investmentsApi.createTransaction({
      accountId,
      type,
      quantity,
      price,
      date,
    });
    revalidatePath('/investments');
    return transaction;
  });
}
