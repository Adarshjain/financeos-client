'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type { EnqueueResponse } from '@/lib/types';

/** Sets a manual price for one instrument (for a date, or today when `asOf` is left out). */
export const setInstrumentPrice = createDomainAction(
  { fallbackError: "Couldn't update the price. Try again." },
  async (instrumentId: string, body: { price: number; asOf?: string }): Promise<void> => {
    await serverApi.POST('/api/v1/instruments/{id}/price', { params: { path: { id: instrumentId } }, body });
  },
);

/** Changes the amount (and optionally the date) of one of the user's manual prices. */
export const updateInstrumentPrice = createDomainAction(
  { fallbackError: "Couldn't update the price. Try again." },
  async (instrumentId: string, priceId: string, price: number, asOf?: string): Promise<void> => {
    await serverApi.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId, priceId } },
      body: asOf ? { price, asOf } : { price },
    });
  },
);

/** Deletes one of the user's manual prices. */
export const deleteInstrumentPrice = createDomainAction(
  { fallbackError: "Couldn't delete the price. Try again." },
  async (instrumentId: string, priceId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/instruments/{instrumentId}/prices/{priceId}', { params: { path: { instrumentId, priceId } } });
  },
);

/** Starts the price-refresh job; the caller follows the returned job id. */
export const startPriceRefresh = createDomainAction(
  { fallbackError: "Couldn't refresh prices. Try again." },
  async (): Promise<EnqueueResponse> => {
    const { data } = await serverApi.POST('/api/v1/investments/prices/refresh', { params: { query: {} } });
    return data! as EnqueueResponse;
  },
);
