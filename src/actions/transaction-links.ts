'use server';

import { revalidatePath } from 'next/cache';

import { transactionLinksApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
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
    const cleanRequest: CreateTransactionLinkRequest = {
      type: request.type,
      members: request.members,
    };
    // FIXME: the `'$undefined'` comparison guards against React's RSC
    // serialisation sentinel arriving as a literal string. No current caller can
    // produce it (TransactionLinkDialog either omits `note` or sends a trimmed
    // non-empty string), so this is either dead or masking a serialisation bug
    // elsewhere. Preserved as-is rather than removed blind — see the follow-up
    // task before deleting.
    if (request.note && (request.note as unknown) !== '$undefined') {
      cleanRequest.note = request.note.trim();
    }
    if (typeof request.alignRefundCategories === 'boolean') {
      cleanRequest.alignRefundCategories = request.alignRefundCategories;
    }

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
