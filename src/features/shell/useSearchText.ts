'use client';

import React from 'react';

import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/useDebouncedValue';

export { SEARCH_DEBOUNCE_MS };

/**
 * The text of a search field, reported to `onCommit` once typing has paused. The list behind the
 * field is server-side, so each committed value is one request.
 */
export function useSearchText(q: string, onCommit: (q: string) => void) {
  const [text, setText] = React.useState(q);
  const debounced = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);
  // A `q` that changed from outside (back, forward) replaces the text. Our own commits arrive as the
  // settled text, so they never do, and keys typed while a commit travels are kept.
  const [seenQ, setSeenQ] = React.useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    if (q !== debounced) setText(q);
  }
  const committed = React.useRef(q);
  const commit = React.useRef(onCommit);
  React.useEffect(() => {
    commit.current = onCommit;
  });
  React.useEffect(() => {
    committed.current = q;
  }, [q]);
  React.useEffect(() => {
    if (debounced === committed.current) return;
    committed.current = debounced;
    commit.current(debounced);
  }, [debounced]);
  return { text, setText };
}
