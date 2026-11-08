'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';
import type { FileIngestionResult } from '@/lib/types';

/** Imports the statement's file into another account, then removes it from this one. */
export const moveStatement = action('moveStatement.moveStatement', createDomainAction(
  { fallbackError: "Couldn't move the statement. Try again." },
  async (accountId: string, statementId: string, targetAccountId: string): Promise<FileIngestionResult> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/statements/{statementId}/move', {
      params: { path: { accountId, statementId } },
      body: { targetAccountId },
    });
    return data as FileIngestionResult;
  },
));
