'use server';

import type { Broker } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import type { CreateDividendRequest, UpdateDividendRequest } from '@/lib/api/types';
import { accountsApi, dividendsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { DividendFilters } from '@/lib/investments.types';
import type { AcceptSuggestionsRequest, AcceptSuggestionsResponse, Dividend, DividendSuggestionsResponse, Position } from '@/lib/types';
import { AccountType } from '@/lib/types';

import type { ReceiptNote } from './dividendsModel';
import { fetchPositions } from './dividendsServerApi';
import type { ConfirmItem, ConfirmResult, DividendReconciliation, UnrecordedCredits } from './receiptTypes';

export interface DividendFormOptions {
  brokers: Pick<Broker, 'id' | 'name' | 'clientId'>[];
  positions: Position[];
}

/** The brokers and held positions the record form chooses from. */
export const loadDividendFormOptions = createDomainAction(
  { fallbackError: "Couldn't load the brokers and holdings. Try again." },
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
  { fallbackError: "Couldn't scan for dividends. Try again." },
  async (brokerAccountId?: string): Promise<DividendSuggestionsResponse> => dividendsApi.suggestions(brokerAccountId),
);

/** Records the chosen suggestions as dividends. */
export const acceptDividendSuggestions = createDomainAction(
  { fallbackError: "Couldn't record the dividends. Try again." },
  async (body: AcceptSuggestionsRequest): Promise<AcceptSuggestionsResponse> => dividendsApi.acceptSuggestions(body),
);

/** Every dividend matching the list's filters, as CSV text and the file name the server suggested. */
export const exportDividendsCsv = createDomainAction(
  { fallbackError: "Couldn't export the dividends. Try again." },
  async (filters: DividendFilters): Promise<{ csv: string; filename: string }> => dividendsApi.exportCsv(filters),
);

const idPath = (id: string) => ({ params: { path: { id } } });

/** Records a dividend. */
export const createDividend = createDomainAction(
  { fallbackError: "Couldn't record the dividend. Try again." },
  async (body: CreateDividendRequest): Promise<Dividend> => {
    const { data } = await serverApi.POST('/api/v1/investments/dividends', { body });
    return data as Dividend;
  },
);

/** Changes a dividend. */
export const updateDividend = createDomainAction(
  { fallbackError: "Couldn't update the dividend. Try again." },
  async (id: string, body: UpdateDividendRequest): Promise<Dividend> => {
    const { data } = await serverApi.PUT('/api/v1/investments/dividends/{id}', { ...idPath(id), body });
    return data as Dividend;
  },
);

/** Deletes a dividend. */
export const deleteDividend = createDomainAction(
  { fallbackError: "Couldn't delete the dividend. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/investments/dividends/{id}', idPath(id));
  },
);

/** Links a dividend to the bank credit it landed as. */
export const linkDividendCredit = createDomainAction(
  { fallbackError: "Couldn't link the bank credit. Try again." },
  async (id: string, transactionId: string, updateTds: boolean): Promise<Dividend> => {
    const { data } = await serverApi.PUT('/api/v1/investments/dividends/{id}/transaction', { ...idPath(id), body: { transactionId, updateTds } });
    return data as Dividend;
  },
);

/** Unlinks a dividend from its bank credit. */
export const unlinkDividendCredit = createDomainAction(
  { fallbackError: "Couldn't unlink the bank credit. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/investments/dividends/{id}/transaction', idPath(id));
  },
);

/** Sets the receipt note of a dividend ('derived' clears it). */
export const setDividendReceiptNote = createDomainAction(
  { fallbackError: "Couldn't update the receipt note. Try again." },
  async (id: string, note: ReceiptNote): Promise<Dividend> => {
    const { data } = await serverApi.PUT('/api/v1/investments/dividends/{id}/receipt-status', {
      ...idPath(id),
      body: { status: note === 'derived' ? null : note },
    });
    return data as Dividend;
  },
);

/** The unmatched dividends with their candidate bank credits. */
export const loadDividendReconciliation = createDomainAction(
  { fallbackError: "Couldn't match the dividends. Try again." },
  async (query: { brokerAccountId?: string }): Promise<DividendReconciliation> => {
    const { data } = await serverApi.GET('/api/v1/investments/dividends/reconciliation', { params: { query } });
    return data as DividendReconciliation;
  },
);

/** Links the chosen bank credits to their dividends. */
export const confirmDividendMatches = createDomainAction(
  { fallbackError: "Couldn't link dividends. Try again." },
  async (items: ConfirmItem[]): Promise<ConfirmResult> => {
    const { data } = await serverApi.POST('/api/v1/investments/dividends/reconciliation/confirm', { body: { items } });
    return data as ConfirmResult;
  },
);

/** Bank credits that look like dividends but are not recorded. */
export const loadUnrecordedDividendCredits = createDomainAction(
  { fallbackError: "Couldn't scan the bank credits. Try again." },
  async (): Promise<UnrecordedCredits> => {
    const { data } = await serverApi.GET('/api/v1/investments/dividends/reconciliation/unrecorded', { params: { query: {} } });
    return data as UnrecordedCredits;
  },
);
