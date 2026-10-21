'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * The ids ticked on the open page. A new `resetKey` (another page, filter, sort or page size) starts from
 * nothing, and ids that are no longer on the page (deleted, merged away, refreshed off it) drop out, so the
 * selection never holds a row the person cannot see.
 */
export function useBulkSelection(resetKey: string, pageIds: readonly string[]) {
  const [state, setState] = useState<{ key: string; ids: string[] }>({ key: resetKey, ids: [] });
  // Forget on the render the key changes, so coming back to an earlier page finds nothing selected.
  if (state.key !== resetKey) setState({ key: resetKey, ids: [] });

  const ids = useMemo(() => {
    const onPage = new Set(pageIds);
    return state.ids.filter((id) => onPage.has(id));
  }, [state, pageIds]);

  const select = useCallback((next: string[]) => setState({ key: resetKey, ids: next }), [resetKey]);
  const clear = useCallback(() => setState({ key: resetKey, ids: [] }), [resetKey]);
  const selectAll = useCallback(() => setState({ key: resetKey, ids: [...pageIds] }), [resetKey, pageIds]);

  return { ids, select, clear, selectAll };
}
