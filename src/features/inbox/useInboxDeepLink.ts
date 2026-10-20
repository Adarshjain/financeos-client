'use client';

import React from 'react';

import type { InboxItemResponse } from '@/lib/api/types';

import { inboxRowId } from './inbox.helpers';

/**
 * Resolve the ?item= deep link once, against the first loaded list: scroll to the row when it is
 * there, or flag it as already handled. Later refetches (after the user acts on the row) do not
 * flip it to "handled".
 */
export function useInboxDeepLink(highlightKey: string | null, items: InboxItemResponse[] | null) {
  const [state, setState] = React.useState<{ found: boolean; missing: boolean }>({ found: false, missing: false });
  const resolved = React.useRef(false);

  React.useEffect(() => {
    if (!highlightKey || !items || resolved.current) return;
    resolved.current = true;
    const found = items.some((i) => i.key === highlightKey);
    setState({ found, missing: !found });
  }, [highlightKey, items]);

  React.useEffect(() => {
    if (!state.found || !highlightKey) return;
    document.getElementById(inboxRowId(highlightKey))?.scrollIntoView({ block: 'center' });
  }, [state.found, highlightKey]);

  return state;
}
