'use client';

import { useEffect, useState } from 'react';

import { EMPTY_SEARCH_RESULT, fetchGlobalSearch, type GlobalSearchResult, SEARCH_MAX_CHARS, SEARCH_MIN_CHARS } from './searchApi';

export const SEARCH_DEBOUNCE_MS = 200;
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
    if (!long) return;
    const cached = cache.get(trimmed);
    if (cached) {
      // Most recently used goes last, so the oldest is the one dropped.
      cache.delete(trimmed);
      cache.set(trimmed, cached);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchGlobalSearch(trimmed, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          cache.set(trimmed, result);
          if (cache.size > SEARCH_CACHE_SIZE) cache.delete(cache.keys().next().value as string);
          setShown({ key: trimmed, result });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setShown({ key: trimmed, result: EMPTY_SEARCH_RESULT });
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, long, cache, version]);

  return { result: long ? shown.result : null, loading: long && shown.key !== trimmed, reset };
}
