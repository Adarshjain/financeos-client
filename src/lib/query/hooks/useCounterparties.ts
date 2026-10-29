'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import {
  loadOutstandingCounterparties,
  searchCounterparties,
  suggestCounterparty,
} from '@/lib/query/actions/counterparties';
import { keys } from '@/lib/query/keys';

/** One short page is all a picker needs: the search box narrows the rest. */
export const COUNTERPARTY_SEARCH_PAGE_SIZE = 20;

/** First page of the caller's counterparties whose name contains `q` (server-side, case-insensitive). */
export function useCounterpartySearch(q: string, enabled = true) {
  const term = q.trim();
  return useQuery({
    queryKey: keys.lendings.counterparties({
      page: 0,
      size: COUNTERPARTY_SEARCH_PAGE_SIZE,
      ...(term ? { q: term } : {}),
    }),
    queryFn: () => unwrapAction(searchCounterparties(term, COUNTERPARTY_SEARCH_PAGE_SIZE)),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Best name match for a transaction description, or null when nothing overlaps. */
export function useCounterpartySuggestion(text: string | null | undefined, enabled = true) {
  const trimmed = text?.trim() ?? '';
  return useQuery({
    queryKey: keys.lendings.counterpartySuggestion(trimmed),
    queryFn: () => unwrapAction(suggestCounterparty(trimmed)),
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
    queryFn: () => unwrapAction(loadOutstandingCounterparties(size)),
  });
}
