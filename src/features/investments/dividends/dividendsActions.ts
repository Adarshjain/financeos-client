'use server';

import type { Broker } from '@/lib/account.types';
import { accountsApi, dividendsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { DividendFilters } from '@/lib/investments.types';
import type { AcceptSuggestionsRequest, AcceptSuggestionsResponse, DividendSuggestionsResponse, Position } from '@/lib/types';
import { AccountType } from '@/lib/types';

import { fetchPositions } from './dividendsServerApi';

export interface DividendFormOptions {
  brokers: Pick<Broker, 'id' | 'name' | 'clientId'>[];
  positions: Position[];
}

/** The brokers and held positions the record form chooses from. */
export const loadDividendFormOptions = createDomainAction(
  { fallbackError: 'Failed to load the brokers and holdings' },
  async (): Promise<DividendFormOptions> => {
    const [accounts, positions] = await Promise.all([accountsApi.list(), fetchPositions()]);
    return {
      brokers: accounts.filter((a) => a.type === AccountType.BROKER).map((a) => ({ id: a.id, name: a.name, clientId: (a as Broker).clientId })),
      positions,
    };
  },
);

/** A scan of the holdings for past payouts that are not recorded yet. */
export const scanDividendSuggestions = createDomainAction(
  { fallbackError: 'Failed to scan for dividends' },
  async (brokerAccountId?: string): Promise<DividendSuggestionsResponse> => dividendsApi.suggestions(brokerAccountId),
);

/** Records the chosen suggestions as dividends. */
export const acceptDividendSuggestions = createDomainAction(
  { fallbackError: 'Failed to record the dividends' },
  async (body: AcceptSuggestionsRequest): Promise<AcceptSuggestionsResponse> => dividendsApi.acceptSuggestions(body),
);

/** Every dividend matching the list's filters, as CSV text and the file name the server suggested. */
export const exportDividendsCsv = createDomainAction(
  { fallbackError: 'Failed to export the dividends' },
  async (filters: DividendFilters): Promise<{ csv: string; filename: string }> => dividendsApi.exportCsv(filters),
);
