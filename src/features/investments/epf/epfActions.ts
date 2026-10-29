'use server';

import { serverApi } from '@/lib/api/server';
import { epfApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

import type { EpfEmployer, EpfEntry, EpfEntryRequest, EpfLatestContribution } from './epfModel';

export type EpfEmployerBody = { name: string; memberId?: string | null; joinedOn?: string | null; leftOn?: string | null };

export interface EpfFormOptions {
  employers: EpfEmployer[];
  /** The newest contribution, which a new contribution is filled from. */
  latestContribution: EpfLatestContribution | null;
}

/** The employers and the newest contribution the add form starts from. */
export const loadEpfFormOptions = createDomainAction(
  { fallbackError: "Couldn't load the employers. Try again." },
  async (): Promise<EpfFormOptions> => {
    const [employers, summary] = await Promise.all([epfApi.employers(), epfApi.summary()]);
    return { employers, latestContribution: summary.latestContribution ?? null };
  },
);

const idPath = (id: string) => ({ params: { path: { id } } });

/** Adds an EPF entry. */
export const createEpfEntry = createDomainAction(
  { fallbackError: "Couldn't add the entry. Try again." },
  async (body: EpfEntryRequest): Promise<EpfEntry> => {
    const { data } = await serverApi.POST('/api/v1/epf/entries', { body });
    return data as EpfEntry;
  },
);

/** Changes an EPF entry. */
export const updateEpfEntry = createDomainAction(
  { fallbackError: "Couldn't update the entry. Try again." },
  async (id: string, body: EpfEntryRequest): Promise<EpfEntry> => {
    const { data } = await serverApi.PUT('/api/v1/epf/entries/{id}', { ...idPath(id), body });
    return data as EpfEntry;
  },
);

/** Deletes an EPF entry. */
export const deleteEpfEntry = createDomainAction(
  { fallbackError: "Couldn't delete the entry. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/epf/entries/{id}', idPath(id));
  },
);

/** Links an EPF entry to its bank credit. */
export const linkEpfEntryCredit = createDomainAction(
  { fallbackError: "Couldn't link the bank credit. Try again." },
  async (id: string, transactionId: string, recordTds: boolean): Promise<EpfEntry> => {
    const { data } = await serverApi.PUT('/api/v1/epf/entries/{id}/transaction', { ...idPath(id), body: { transactionId, recordTds } });
    return data as EpfEntry;
  },
);

/** Unlinks an EPF entry from its bank credit. */
export const unlinkEpfEntryCredit = createDomainAction(
  { fallbackError: "Couldn't unlink the bank credit. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/epf/entries/{id}/transaction', idPath(id));
  },
);

/** Dismisses the suggested bank credit of an EPF entry. */
export const dismissEpfSuggestion = createDomainAction(
  { fallbackError: "Couldn't dismiss the suggestion. Try again." },
  async (id: string, transactionId: string): Promise<void> => {
    await serverApi.POST('/api/v1/epf/entries/{id}/suggestion/dismiss', { ...idPath(id), body: { transactionId } });
  },
);

/** Adds an employer. */
export const createEpfEmployer = createDomainAction(
  { fallbackError: "Couldn't add the employer. Try again." },
  async (body: EpfEmployerBody): Promise<EpfEmployer> => {
    const { data } = await serverApi.POST('/api/v1/epf/employers', { body });
    return data as EpfEmployer;
  },
);

/** Changes an employer. */
export const updateEpfEmployer = createDomainAction(
  { fallbackError: "Couldn't update the employer. Try again." },
  async (id: string, body: EpfEmployerBody): Promise<EpfEmployer> => {
    const { data } = await serverApi.PUT('/api/v1/epf/employers/{id}', { ...idPath(id), body });
    return data as EpfEmployer;
  },
);
