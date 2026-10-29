'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { InstrumentType, ResolveInstrumentRequest } from '@/lib/types';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/useDebouncedValue';

import { resolveInstrument, searchCatalog } from './instrumentActions';

/** Shared debounced AMFI/Yahoo catalog search, used by InstrumentSearchField and InstrumentTypeahead. */
export function useCatalogSearch(rawQuery: string, type?: InstrumentType) {
  const debouncedQuery = useDebouncedValue(rawQuery.trim(), SEARCH_DEBOUNCE_MS);

  const enabled = debouncedQuery.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: keys.investments.catalogSearch(debouncedQuery, type),
    queryFn: () => unwrapAction(searchCatalog(debouncedQuery, type)),
    enabled,
  });

  return {
    results: data ?? [],
    isLoading: enabled && isFetching,
    hasQuery: enabled,
  };
}

/** Resolves a catalog candidate to a persisted instrument (dedup-or-create on the server). */
export function useResolveInstrumentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ResolveInstrumentRequest) => unwrapAction(resolveInstrument(req)),
    onSuccess: () => {
      invalidateInvestmentQueries(qc);
    },
  });
}
