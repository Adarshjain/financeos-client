'use client';

import React from 'react';

import { appHref } from '@/features/shell/routes';
import type { InboxItemResponse } from '@/lib/api/types';
import { useAppRouter } from '@/lib/useAppRouter';

/**
 * Old notifications link to /inbox?item=<key>. Resolve it once, against the first loaded list: when the row is
 * there, replace the address with the page it points at (so Back does not return to the redirect); otherwise
 * stay on the Inbox.
 */
export function useInboxDeepLink(highlightKey: string | null, items: InboxItemResponse[] | null) {
  const router = useAppRouter();
  const resolved = React.useRef(false);

  React.useEffect(() => {
    if (!highlightKey || !items || resolved.current) return;
    resolved.current = true;
    const href = items.find((i) => i.key === highlightKey)?.href;
    if (href) router.replace(appHref(href));
  }, [highlightKey, items, router]);
}
