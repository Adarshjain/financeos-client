'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { CounterpartyResponse } from '@/lib/lending.types';
import type { Page } from '@/lib/pagination';
import { keys } from '@/lib/query/keys';

/** One short page is all a picker needs: the search box narrows the rest. */
export const COUNTERPARTY_SEARCH_PAGE_SIZE = 20;

const EMPTY_PAGE: Page<CounterpartyResponse> = {
  content: [],
  number: 0,
  size: COUNTERPARTY_SEARCH_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  empty: true,
};

/** First page of the caller's counterparties whose name contains `q` (server-side, case-insensitive). */
export function useCounterpartySearch(q: string, enabled = true) {
  const term = q.trim();
  return useQuery({
    queryKey: keys.lendings.counterparties({
      page: 0,
      size: COUNTERPARTY_SEARCH_PAGE_SIZE,
      ...(term ? { q: term } : {}),
    }),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/counterparties', {
        params: {
          query: { page: 0, size: COUNTERPARTY_SEARCH_PAGE_SIZE, ...(term ? { q: term } : {}) },
        },
      });
      return (data ?? EMPTY_PAGE) as Page<CounterpartyResponse>;
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Best name match for a transaction description, or null when nothing overlaps. */
export function useCounterpartySuggestion(text: string | null | undefined, enabled = true) {
  const trimmed = text?.trim() ?? '';
  return useQuery({
    queryKey: keys.lendings.counterpartySuggestion(trimmed),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/counterparties/suggest', {
        params: { query: { text: trimmed } },
      });
      return (data?.counterparty ?? null) as CounterpartyResponse | null;
    },
    enabled: enabled && trimmed.length > 0,
  });
}

// --- Dashboard widgets (investments & loans group) ---

/**
 * One page of people with a nonzero balance, largest |net| first (lending_balances
 * widget). Under keys.lendings.all, so invalidateLendingQueries refreshes it.
 */
export function useOutstandingCounterparties(size: number) {
  return useQuery({
    queryKey: keys.lendings.counterparties({ page: 0, size, outstanding: true, sort: 'net' }),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/counterparties', {
        params: { query: { page: 0, size, outstanding: true, sort: ['net'] } },
      });
      return (data ?? { ...EMPTY_PAGE, size }) as Page<CounterpartyResponse>;
    },
  });
}
