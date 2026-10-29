'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import type { AssetClass, CreateInstrumentRequest, Instrument } from '@/lib/types';

import { resetInstrumentOverrides, updateInstrument } from './instrumentActions';

export interface UpdateInstrumentVars {
  body: CreateInstrumentRequest;
  /** The asset class to pin (null = back to Auto); omit to leave it as it is. */
  assetClass?: AssetClass | null;
}

export interface UpdateInstrumentResult {
  instrument: Instrument;
  /**
   * True when an identifier edit moved this user's holdings to another catalog
   * instrument: `instrument.id` is then that instrument's id, not the edited one.
   */
  moved: boolean;
  /** True when the move merged this holding into one the user already had on the target. */
  merged: boolean;
  /** The server's note when the merge may change realised figures (both holdings had sells). */
  mergeNote: string | null;
}

/**
 * Edits an instrument for the signed-in user's account only (PUT /instruments/{id}),
 * then — when asked — pins or clears their asset class (PATCH) on whichever
 * instrument the edit resolved to. Every investments query and widget is
 * invalidated afterwards, also when the second call fails after the first saved.
 */
export function useUpdateInstrument(instrumentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, assetClass }: UpdateInstrumentVars): Promise<UpdateInstrumentResult> =>
      unwrapAction(updateInstrument(instrumentId, body, assetClass)),
    onSettled: () => invalidateInvestmentQueries(qc),
  });
}

/** Drops every edit the signed-in user made to an instrument (DELETE /instruments/{id}/overrides). */
export function useResetInstrumentOverrides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<Instrument> => unwrapAction(resetInstrumentOverrides(id)),
    onSettled: () => invalidateInvestmentQueries(qc),
  });
}
