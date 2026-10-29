'use client';

import { useEffect, useState } from 'react';

import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/useDebouncedValue';

import { EMPTY_SEARCH_RESULT, fetchGlobalSearch, type GlobalSearchResult, SEARCH_MAX_CHARS, SEARCH_MIN_CHARS } from './searchApi';

export { SEARCH_DEBOUNCE_MS };
export const SEARCH_CACHE_SIZE = 20;

export interface GlobalSearchState {
  /** Forgets every remembered answer and searches the current text again (what they hold went stale). */
  reset: () => void;
  /** The latest answer; stays on the previous one while a new query loads. Null before any search. */
  result: GlobalSearchResult | null;
  /** A request is pending or in flight. */
  loading: boolean;
}

/**
 * Searches the server for `query` once it has SEARCH_MIN_CHARS trimmed characters: waits for a pause in
 * typing, cancels the request of an older query, ignores its answer, and remembers the last answers so
 * backspacing is instant. A failed request reads as no results; it never throws.
 */
export function useGlobalSearch(query: string): GlobalSearchState {
  const trimmed = query.trim();
  const settled = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS, '');
  const [version, setVersion] = useState(0);
  const [cache] = useState(() => new Map<string, GlobalSearchResult>());
  // What is on screen and the query it answers. Adjusted while rendering (a cache hit, text too short), so
  // those changes show at once; a network answer arrives through the effect below.
  const [shown, setShown] = useState<{ key: string; result: GlobalSearchResult | null }>({ key: '', result: null });
  const long = trimmed.length >= SEARCH_MIN_CHARS && trimmed.length <= SEARCH_MAX_CHARS;
  const hit = long ? cache.get(trimmed) : undefined;

  if (!long && shown.result !== null) setShown({ key: '', result: null });
  else if (hit && (shown.key !== trimmed || shown.result !== hit)) setShown({ key: trimmed, result: hit });

  const reset = () => {
    cache.clear();
    setShown({ key: '', result: null });
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    const settledLong = settled.length >= SEARCH_MIN_CHARS && settled.length <= SEARCH_MAX_CHARS;
    // Typing on aborts the older request at once; the new text is searched when the pause settles on it.
    if (!settledLong || settled !== trimmed) return;
    const cached = cache.get(settled);
    if (cached) {
      // Most recently used goes last, so the oldest is the one dropped.
      cache.delete(settled);
      cache.set(settled, cached);
      return;
    }
    const controller = new AbortController();
    fetchGlobalSearch(settled, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        cache.set(settled, result);
        if (cache.size > SEARCH_CACHE_SIZE) cache.delete(cache.keys().next().value as string);
        setShown({ key: settled, result });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setShown({ key: settled, result: EMPTY_SEARCH_RESULT });
      });
    return () => controller.abort();
  }, [settled, trimmed, cache, version]);

  return { result: long ? shown.result : null, loading: long && shown.key !== trimmed, reset };
}
