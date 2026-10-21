'use client';

import React from 'react';

import type { TopBarAction } from '@/components/ds';
import {
  useNotificationFeed,
  useNotificationMutations,
  useNotificationSummary,
} from '@/lib/query/hooks/useNotifications';

import { DROPDOWN_SIZE, NotificationsDropdown } from './NotificationsDropdown';

const NONE: ReadonlySet<string> = new Set();

/**
 * The bell for the top bar: a dot while something is unread, a dropdown of the latest ten. Opening
 * it keeps the rows that were unread highlighted, then marks everything shown as read.
 */
export function useNotificationsAction(): TopBarAction {
  const { data: summary } = useNotificationSummary();
  const feed = useNotificationFeed(0, DROPDOWN_SIZE);
  const { markRead } = useNotificationMutations();
  const [highlighted, setHighlighted] = React.useState<ReadonlySet<string>>(NONE);
  const unread = summary?.unread ?? 0;

  const onOpenChange = async (open: boolean) => {
    if (!open) return;
    const unreadIds = (rows: { id: string; read: boolean }[]) => new Set(rows.filter((n) => !n.read).map((n) => n.id));
    // Highlight from the cache at once, then look again for new arrivals before deciding what was unread.
    setHighlighted(unreadIds(feed.data?.content ?? []));
    const items = (unread > 0 ? (await feed.refetch()).data : feed.data)?.content ?? [];
    setHighlighted(unreadIds(items));
    if (unread > 0 && items.length > 0) markRead.mutate(items[0].createdAt);
  };

  return {
    id: 'notifications',
    icon: 'notifications',
    label: 'Notifications',
    dot: unread > 0,
    popover: { content: <NotificationsDropdown highlightedIds={highlighted} />, onOpenChange },
  };
}
