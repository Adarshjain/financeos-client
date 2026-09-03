'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type {
  Instrument,
  InstrumentCandidate,
  InstrumentType,
  ResolveInstrumentRequest,
} from '@/lib/types';

/** Shared debounced AMFI/Yahoo catalog search, used by InstrumentSearchField and InstrumentTypeahead. */
export function useCatalogSearch(rawQuery: string, type?: InstrumentType) {
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery.trim());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(rawQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const enabled = debouncedQuery.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: keys.investments.catalogSearch(debouncedQuery, type),
    queryFn: async () =>
      (
        await api.GET('/api/v1/instruments/catalog-search', {
          params: { query: { q: debouncedQuery, type } },
        })
      ).data! as InstrumentCandidate[],
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
    mutationFn: (req: ResolveInstrumentRequest) =>
      api
        .POST('/api/v1/instruments/resolve', { body: req })
        .then((r) => r.data! as Instrument),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.investments.all });
    },
  });
}
