'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type {
  AssetClass,
  CreateInstrumentRequest,
  Instrument,
  InstrumentCandidate,
  InstrumentType,
  ResolveInstrumentRequest,
} from '@/lib/types';

import type { UpdateInstrumentResult } from './useInstrumentEdit';

/** AMFI / Yahoo candidates for the typed text. */
export const searchCatalog = createDomainAction(
  { fallbackError: "Couldn't search the catalog. Try again." },
  async (q: string, type?: InstrumentType): Promise<InstrumentCandidate[]> => {
    const { data } = await serverApi.GET('/api/v1/instruments/catalog-search', { params: { query: { q, type } } });
    return data! as InstrumentCandidate[];
  },
);

/** Resolves a catalog candidate to a persisted instrument (dedup-or-create on the server). */
export const resolveInstrument = createDomainAction(
  { fallbackError: "Couldn't add the instrument. Try again." },
  async (body: ResolveInstrumentRequest): Promise<Instrument> => {
    const { data } = await serverApi.POST('/api/v1/instruments/resolve', { body });
    return data! as Instrument;
  },
);

/** Creates an instrument by hand. */
export const createInstrument = createDomainAction(
  { fallbackError: "Couldn't add instrument. Try again." },
  async (body: CreateInstrumentRequest): Promise<Instrument> => {
    const { data } = await serverApi.POST('/api/v1/instruments', { body });
    return data! as Instrument;
  },
);

/**
 * Edits an instrument for the signed-in user's account only, then (when `assetClass` is given, null = back to Auto)
 * pins or clears its asset class on whichever instrument the edit resolved to.
 */
export const updateInstrument = createDomainAction(
  { fallbackError: "Couldn't update instrument. Try again." },
  async (instrumentId: string, body: CreateInstrumentRequest, assetClass?: AssetClass | null): Promise<UpdateInstrumentResult> => {
    const put = await serverApi.PUT('/api/v1/instruments/{id}', { params: { path: { id: instrumentId } }, body });
    let saved = put.data! as Instrument;
    // Only the PUT answer carries the merge outcome; a follow-up PATCH answer does not.
    const merged = Boolean(saved.mergedHoldings);
    const mergeNote = saved.mergeNote ?? null;
    if (assetClass !== undefined) {
      const patch = await serverApi.PATCH('/api/v1/instruments/{id}', { params: { path: { id: saved.id } }, body: { assetClass } });
      saved = patch.data! as Instrument;
    }
    return { instrument: saved, moved: saved.id !== instrumentId, merged, mergeNote };
  },
);

/** Drops every edit the signed-in user made to an instrument. */
export const resetInstrumentOverrides = createDomainAction(
  { fallbackError: "Couldn't reset the instrument. Try again." },
  async (id: string): Promise<Instrument> => {
    const { data } = await serverApi.DELETE('/api/v1/instruments/{id}/overrides', { params: { path: { id } } });
    return data! as Instrument;
  },
);
