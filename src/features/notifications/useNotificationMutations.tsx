'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { showToast, type TopBarAction } from '@/components/ds';
import type { AppNotification, NotificationFeedPage } from '@/lib/api/types';
import {
  useNotificationFeed,
  useNotificationMutations as useFeedMutations,
  useNotificationSummary,
} from '@/lib/query/hooks/useNotifications';
import { keys } from '@/lib/query/keys';

import { DROPDOWN_SIZE, NotificationsDropdown } from './NotificationsDropdown';

type FeedEntry = [readonly unknown[], NotificationFeedPage | undefined];

const isFeedKey = (key: readonly unknown[]) => key[1] === 'feed';

/**
 * Clear and clear all on the notifications page. Clearing one removes the row at once and offers
 * Undo in the toast (which restores it); a failure puts the row back.
 */
export function useNotificationMutations() {
  const qc = useQueryClient();
  const { clear, restore, clearAll } = useFeedMutations();

  const undo = async (id: string) => {
    try {
      await restore.mutateAsync(id);
      showToast('Restored');
    } catch {
      showToast("Couldn't restore. Try again.", { tone: 'danger' });
    }
  };

  const clearOne = async (n: AppNotification) => {
    await qc.cancelQueries({ queryKey: keys.notifications.all });
    const snapshot = qc
      .getQueriesData<NotificationFeedPage>({ queryKey: keys.notifications.all })
      .filter(([key]) => isFeedKey(key)) as FeedEntry[];
    qc.setQueriesData<NotificationFeedPage>(
      { queryKey: keys.notifications.all, predicate: (q) => isFeedKey(q.queryKey) },
      (old) =>
        old && old.content.some((i) => i.id === n.id)
          ? { ...old, content: old.content.filter((i) => i.id !== n.id), totalElements: old.totalElements - 1 }
          : old,
    );
    try {
      await clear.mutateAsync(n.id);
      showToast('Notification cleared', { action: { label: 'Undo', onSelect: () => void undo(n.id) } });
    } catch {
      for (const [key, data] of snapshot) if (data) qc.setQueryData(key, data);
      showToast("Couldn't clear. The notification is back.", { tone: 'danger' });
    }
  };

  const clearEverything = async (): Promise<boolean> => {
    try {
      await clearAll.mutateAsync();
      showToast('Notifications cleared');
      return true;
    } catch {
      showToast("Couldn't clear notifications. Try again.", { tone: 'danger' });
      return false;
    }
  };

  return { clearOne, clearEverything, clearing: clear.isPending, clearingAll: clearAll.isPending };
}

const NONE: ReadonlySet<string> = new Set();

/**
 * The bell for the top bar: a dot while something is unread, a dropdown of the latest ten. Opening
 * it keeps the rows that were unread highlighted, then marks everything shown as read.
 */
export function useNotificationsAction(): TopBarAction {
  const { data: summary } = useNotificationSummary();
  const feed = useNotificationFeed(0, DROPDOWN_SIZE);
  const { markRead } = useFeedMutations();
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
