'use client';

import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { watchSession } from '@/lib/authExpiry';
import type { ApiResult } from '@/lib/types';

import type { HoldingSection } from './holdingModel';

/**
 * A card's list: the page the server rendered, then the page a pager press asks the server for. A fresh
 * render from the server replaces what is shown only when its first page actually changed (a record, edit or
 * delete); a refresh with the same data (live prices, window focus) keeps the page the user is on. `reload`
 * refetches the page shown (an edit on page 2 or later leaves page 0 unchanged), and drops its result if the
 * list was reset or paged meanwhile.
 */
export function useSectionPage<R>(initial: HoldingSection<R>, load: (page: number) => Promise<ApiResult<HoldingSection<R>>>) {
  const [section, setSection] = React.useState(initial);
  const key = JSON.stringify(initial);
  const firstKey = React.useRef(key);
  const generation = React.useRef(0);
  const shown = React.useRef(section);
  React.useEffect(() => {
    shown.current = section;
  }, [section]);
  React.useEffect(() => {
    if (firstKey.current === key) return;
    firstKey.current = key;
    generation.current += 1;
    setSection(initial);
  }, [key, initial]);

  const goTo = async (page: number) => {
    generation.current += 1;
    const result = await watchSession(load(page));
    if (result.success) setSection(result.data);
    else showToast(result.error.message, { tone: 'danger' });
  };

  const reload = async () => {
    const page = shown.current.position.page;
    if (page === 0) return;
    const started = generation.current;
    const result = await watchSession(load(page));
    if (generation.current === started && result.success) setSection(result.data);
  };
  return { section, goTo, reload };
}
