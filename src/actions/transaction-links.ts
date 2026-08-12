'use server';

import { transactionLinksApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import { sanitizeCreateLinkRequest } from '@/lib/transaction.helpers';
import type { CreateTransactionLinkRequest } from '@/lib/transaction.types';

const TRANSACTION_PATHS = ['/transactions', '/transactions/review'];

export const createTransactionLink = createDomainAction(
  { fallbackError: 'Failed to create transaction link', revalidatePaths: TRANSACTION_PATHS },
  (request: CreateTransactionLinkRequest) => {
    const cleanRequest = sanitizeCreateLinkRequest(request);
    return transactionLinksApi.create(cleanRequest);
  }
);

export const deleteTransactionLink = createDomainAction(
  { fallbackError: 'Failed to delete transaction link', revalidatePaths: TRANSACTION_PATHS },
  (linkId: string) => transactionLinksApi.delete(linkId)
);

export const getTransactionLinks = createDomainAction(
  { fallbackError: 'Failed to fetch transaction links' },
  (transactionId: string) => transactionLinksApi.getByTransactionId(transactionId)
);
