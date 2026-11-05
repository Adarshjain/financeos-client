'use server';

import { serverApi } from '@/lib/api/server';
import { epfApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { PriceHistoryPoint } from '@/lib/types';

import type { EpfEmployer } from '../epf/epfModel';
import { fetchPriceHistory } from '../investmentsServerApi';
import type { NpsStatement } from './npsImportModel';
import type { NpsAccount, NpsAccountRequest, NpsAllocationRequest, NpsEntry, NpsEntryRequest, NpsScheme, NpsSchemeDetail } from './npsModel';
import { fetchNpsSchemeDetail, fetchNpsStatements } from './npsServerApi';

export interface NpsFormOptions {
  employers: EpfEmployer[];
  /** Every scheme in the catalog, with its latest NAV. */
  schemes: NpsScheme[];
}

/** The employers (the EPF list) and the scheme catalog the forms choose from. */
export const loadNpsFormOptions = createDomainAction(
  { fallbackError: "Couldn't load the NPS schemes. Try again." },
  async (): Promise<NpsFormOptions> => {
    const [employers, schemes] = await Promise.all([epfApi.employers(), serverApi.GET('/api/v1/nps/schemes', { params: { query: {} } })]);
    return { employers, schemes: (schemes.data ?? []) as NpsScheme[] };
  },
);

export interface NpsSchemeSheetData {
  detail: NpsSchemeDetail;
  history: PriceHistoryPoint[] | null;
}

/** One scheme with its holdings, entries and NAV history (the history may fail on its own). */
export const loadNpsSchemeSheet = createDomainAction(
  { fallbackError: "Couldn't load the scheme. Try again." },
  async (code: string): Promise<NpsSchemeSheetData> => {
    const detail = await fetchNpsSchemeDetail(code);
    const history = await fetchPriceHistory(detail.scheme.instrumentId).catch(() => null);
    return { detail, history };
  },
);

const idPath = (id: string) => ({ params: { path: { id } } });

export const createNpsAccount = createDomainAction(
  { fallbackError: "Couldn't add the account. Try again." },
  async (body: NpsAccountRequest): Promise<NpsAccount> => {
    const { data } = await serverApi.POST('/api/v1/nps/accounts', { body });
    return data as NpsAccount;
  },
);

export const updateNpsAccount = createDomainAction(
  { fallbackError: "Couldn't update the account. Try again." },
  async (id: string, body: NpsAccountRequest): Promise<NpsAccount> => {
    const { data } = await serverApi.PUT('/api/v1/nps/accounts/{id}', { ...idPath(id), body });
    return data as NpsAccount;
  },
);

export const replaceNpsAllocation = createDomainAction(
  { fallbackError: "Couldn't save the allocation. Try again." },
  async (id: string, body: NpsAllocationRequest): Promise<NpsAccount> => {
    const { data } = await serverApi.PUT('/api/v1/nps/accounts/{id}/allocation', { ...idPath(id), body });
    return data as NpsAccount;
  },
);

export const createNpsEntry = createDomainAction(
  { fallbackError: "Couldn't save the entry. Try again." },
  async (body: NpsEntryRequest): Promise<NpsEntry> => {
    const { data } = await serverApi.POST('/api/v1/nps/entries', { body });
    return data as unknown as NpsEntry;
  },
);

export const loadNpsStatements = createDomainAction(
  { fallbackError: "Couldn't load the statements. Try again." },
  async (accountId: string): Promise<NpsStatement[]> => fetchNpsStatements(accountId),
);

export const deleteNpsStatement = createDomainAction(
  { fallbackError: "Couldn't delete the statement. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/nps/import/statements/{id}', { ...idPath(id) });
  },
);

/** A new account found in Gmail: adds it as the user's own or their child's and starts importing its statements. */
export const addNpsGmailDetection = createDomainAction(
  { fallbackError: "Couldn't add the account. Try again." },
  async (key: string, relation: 'SELF' | 'CHILD'): Promise<{ accountId: string; importing: number }> => {
    const { data } = await serverApi.POST('/api/v1/nps/gmail-detections/{key}/account', { params: { path: { key } }, body: { relation } });
    return { accountId: data?.accountId ?? '', importing: data?.importing ?? 0 };
  },
);

export const ignoreNpsGmailDetection = createDomainAction(
  { fallbackError: "Couldn't ignore this account. Try again." },
  async (key: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/nps/gmail-detections/{key}', { params: { path: { key } } });
  },
);

/** Re-queues the Gmail NPS statements that failed to import; says how many are importing again. */
export const retryNpsGmailImports = createDomainAction(
  { fallbackError: "Couldn't retry the imports. Try again." },
  async (): Promise<{ importing: number }> => {
    const { data } = await serverApi.POST('/api/v1/nps/gmail-detections/retry');
    return { importing: data?.importing ?? 0 };
  },
);

/** Tries one password on every locked NPS statement; says how many opened and how many are still locked. */
export const unlockNpsGmailStatements = createDomainAction(
  { fallbackError: "Couldn't unlock the statements. Try again." },
  async (password: string): Promise<{ opened: number; stillLocked: number }> => {
    const { data } = await serverApi.POST('/api/v1/nps/gmail-detections/password', { body: { password } });
    return { opened: data?.opened ?? 0, stillLocked: data?.stillLocked ?? 0 };
  },
);
