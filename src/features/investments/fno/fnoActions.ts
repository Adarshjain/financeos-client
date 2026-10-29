'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type { CreateFnoTradeRequest, FnoTradeResponse } from '@/lib/types';

import { fetchFnoCsv } from './fnoServerApi';

/** The financial year's F&O trades as the server's ITR export CSV. */
export const exportFnoCsv = createDomainAction(
  { fallbackError: "Couldn't export F&O trades. Try again." },
  async (fy: number) => fetchFnoCsv(fy),
);

/** Records an F&O trade. */
export const createFnoTrade = createDomainAction(
  { fallbackError: "Couldn't save the F&O trade. Try again." },
  async (body: CreateFnoTradeRequest): Promise<FnoTradeResponse> => {
    const { data } = await serverApi.POST('/api/v1/investments/fno', { body });
    return data! as FnoTradeResponse;
  },
);

/** Changes an F&O trade. */
export const updateFnoTrade = createDomainAction(
  { fallbackError: "Couldn't save the F&O trade. Try again." },
  async (id: string, body: CreateFnoTradeRequest): Promise<FnoTradeResponse> => {
    const { data } = await serverApi.PUT('/api/v1/investments/fno/{id}', { params: { path: { id } }, body });
    return data! as FnoTradeResponse;
  },
);

/** Deletes an F&O trade. */
export const deleteFnoTrade = createDomainAction(
  { fallbackError: "Couldn't delete the F&O trade. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/investments/fno/{id}', { params: { path: { id } } });
  },
);
