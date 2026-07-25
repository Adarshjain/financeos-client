'use server';

import { revalidatePath } from 'next/cache';

import { transactionLinksApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import { sanitizeCreateLinkRequest } from '@/lib/transaction.helpers';
import type { CreateTransactionLinkRequest, TransactionLinkResponse } from '@/lib/transaction.types';
import type { ApiResult } from '@/lib/types';

function revalidateTransactionViews(): void {
  revalidatePath('/transactions');
  revalidatePath('/transactions/review');
}

export async function createTransactionLink(
  request: CreateTransactionLinkRequest,
): Promise<ApiResult<TransactionLinkResponse>> {
  return apiResult('Failed to create transaction link', async () => {
    const cleanRequest = sanitizeCreateLinkRequest(request);

    const data = await transactionLinksApi.create(cleanRequest);
    revalidateTransactionViews();
    return data;
  });
}

export async function deleteTransactionLink(
  linkId: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete transaction link', async () => {
    await transactionLinksApi.delete(linkId);
    revalidateTransactionViews();
  });
}

export async function getTransactionLinks(
  transactionId: string,
): Promise<ApiResult<TransactionLinkResponse[]>> {
  return apiResult('Failed to fetch transaction links', () =>
    transactionLinksApi.getByTransactionId(transactionId),
  );
}
