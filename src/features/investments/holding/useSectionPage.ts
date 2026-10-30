'use client';

import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { watchSession } from '@/lib/authExpiry';
import type { ApiResult } from '@/lib/types';

import type { HoldingSection } from './holdingModel';

/**
 * A card's list: the page the server rendered, then the page a pager press asks the server for. A fresh
 * render from the server replaces what is shown only when its first page actually changed (a record, edit or
 * delete); a refresh with the same data (live prices, window focus) keeps the page the user is on.
 */
export function useSectionPage<R>(initial: HoldingSection<R>, load: (page: number) => Promise<ApiResult<HoldingSection<R>>>) {
  const [section, setSection] = React.useState(initial);
  const key = JSON.stringify(initial);
  const firstKey = React.useRef(key);
  React.useEffect(() => {
    if (firstKey.current === key) return;
    firstKey.current = key;
    setSection(initial);
  }, [key, initial]);

  const goTo = async (page: number) => {
    const result = await watchSession(load(page));
    if (result.success) setSection(result.data);
    else showToast(result.error.message, { tone: 'danger' });
  };
  return { section, goTo };
}
