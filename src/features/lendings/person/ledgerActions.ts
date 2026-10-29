'use server';

import { counterpartiesApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { LedgerEntryResponse } from '@/lib/lending.types';

/** Every entry of one person, newest first: loaded only when Export ledger opens, never with the page. */
export const loadPersonLedger = createDomainAction(
  { fallbackError: "Couldn't load the ledger. Try again." },
  async (counterpartyId: string, entryCount: number): Promise<LedgerEntryResponse[]> => {
    const ledger = await counterpartiesApi.ledger(counterpartyId, 0, Math.max(entryCount, 1));
    return ledger.entries.content;
  },
);
