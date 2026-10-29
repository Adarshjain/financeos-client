'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';

import { deleteInstrumentPrice, setInstrumentPrice, updateInstrumentPrice } from './priceActions';

/**
 * The three ways a user changes one instrument's prices: set a manual price for a date, change the amount of
 * one of their manual prices, delete one. Each refreshes every investment query on success.
 */
export function usePriceMutations(instrumentId: string) {
  const qc = useQueryClient();
  const onSuccess = () => invalidateInvestmentQueries(qc);

  const setPrice = useMutation({
    mutationFn: (body: { price: number; asOf?: string }) =>
      unwrapAction(setInstrumentPrice(instrumentId, body)),
    onSuccess,
  });

  const updatePrice = useMutation({
    mutationFn: (vars: { priceId: string; price: number; asOf?: string }) =>
      unwrapAction(updateInstrumentPrice(instrumentId, vars.priceId, vars.price, vars.asOf)),
    onSuccess,
  });

  const deletePrice = useMutation({
    mutationFn: (priceId: string) =>
      unwrapAction(deleteInstrumentPrice(instrumentId, priceId)),
    onSuccess,
  });

  return { setPrice, updatePrice, deletePrice };
}
