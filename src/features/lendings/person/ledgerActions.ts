'use server';

import { counterpartiesApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { LedgerEntryResponse, LendingCycleResponse } from '@/lib/lending.types';
import { action } from '@/lib/observability/action';

/** Every entry of one person, newest first, with their cycles: loaded only when Export ledger opens, never with the page. */
export const loadPersonLedger = action('ledger.loadPersonLedger', createDomainAction(
  { fallbackError: "Couldn't load the ledger. Try again." },
  async (counterpartyId: string, entryCount: number): Promise<{ entries: LedgerEntryResponse[]; cycles: LendingCycleResponse[] }> => {
    const ledger = await counterpartiesApi.ledger(counterpartyId, 0, Math.max(entryCount, 1));
    return { entries: ledger.entries.content, cycles: ledger.cycles };
  },
));
