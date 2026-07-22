'use server';

import { revalidatePath } from 'next/cache';

import { ApiError, transactionLinksApi } from '@/lib/apiClient';
import type { CreateTransactionLinkRequest, TransactionLinkResponse } from '@/lib/transaction.types';
import type { ApiResult, ErrorResponse } from '@/lib/types';

function handleLinkError(error: unknown, defaultMessage: string): { success: false; error: ErrorResponse } {
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

export async function createTransactionLink(
  request: CreateTransactionLinkRequest,
): Promise<ApiResult<TransactionLinkResponse>> {
  try {
    const cleanRequest: CreateTransactionLinkRequest = {
      type: request.type,
      members: request.members,
    };
    if (request.note && (request.note as unknown) !== '$undefined') {
      cleanRequest.note = request.note.trim();
    }
    if (typeof request.alignRefundCategories === 'boolean') {
      cleanRequest.alignRefundCategories = request.alignRefundCategories;
    }

    const data = await transactionLinksApi.create(cleanRequest);
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data };
  } catch (error) {
    return handleLinkError(error, 'Failed to create transaction link');
  }
}

export async function deleteTransactionLink(
  linkId: string,
): Promise<ApiResult<void>> {
  try {
    await transactionLinksApi.delete(linkId);
    revalidatePath('/transactions');
    revalidatePath('/transactions/review');
    return { success: true, data: undefined };
  } catch (error) {
    return handleLinkError(error, 'Failed to delete transaction link');
  }
}

export async function getTransactionLinks(
  transactionId: string,
): Promise<ApiResult<TransactionLinkResponse[]>> {
  try {
    const data = await transactionLinksApi.getByTransactionId(transactionId);
    return { success: true, data };
  } catch (error) {
    return handleLinkError(error, 'Failed to fetch transaction links');
  }
}
