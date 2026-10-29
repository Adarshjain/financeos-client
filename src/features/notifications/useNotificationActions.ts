'use client';

import { useQueryClient } from '@tanstack/react-query';

import { showToast } from '@/components/ds';
import type { AppNotification, NotificationFeedPage } from '@/lib/api/types';
import { useNotificationMutations } from '@/lib/query/hooks/useNotifications';
import { keys } from '@/lib/query/keys';

type FeedEntry = [readonly unknown[], NotificationFeedPage | undefined];

const isFeedKey = (key: readonly unknown[]) => key[1] === 'feed';

/**
 * Clear and clear all on the notifications page. Clearing one removes the row at once and offers
 * Undo in the toast (which restores it); a failure puts the row back.
 */
export function useNotificationActions() {
  const qc = useQueryClient();
  const { clear, restore, clearAll } = useNotificationMutations();

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
