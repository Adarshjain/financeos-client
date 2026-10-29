'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type { LendingTransferSuggestion } from '@/lib/lending.types';

/** The bank transfers the server finds for this person's unlinked entries (the matching tolerance is the server's). */
export const loadPersonMatches = createDomainAction(
  { fallbackError: "Couldn't find matching bank transactions. Try again." },
  async (counterpartyId: string): Promise<LendingTransferSuggestion[]> => {
    const { data } = await serverApi.GET('/api/v1/counterparties/{id}/match-suggestions', {
      params: { path: { id: counterpartyId } },
    });
    return (data?.suggestions ?? []) as unknown as LendingTransferSuggestion[];
  },
);
