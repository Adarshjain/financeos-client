'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

import { unwrapAction } from '@/lib/actionResult';
import type { NotificationFeedPage, NotificationFeedSummary } from '@/lib/api/types';
import {
  clearAllNotifications,
  clearNotification,
  loadNotificationFeed,
  loadNotificationSummary,
  markNotificationsRead,
  restoreNotification,
} from '@/lib/query/actions/notificationActions';
import { useShellCounts } from '@/lib/query/hooks/useShellCounts';
import { keys } from '@/lib/query/keys';

/** One page of the notification feed, newest first (page is 0-based). Refetches on window focus. */
export function useNotificationFeed(page: number, size: number, enabled = true) {
  return useQuery({
    enabled,
    queryKey: keys.notifications.feed(page, size),
    queryFn: async (): Promise<NotificationFeedPage> => {
      return unwrapAction(loadNotificationFeed(page, size));
    },
  });
}

/**
 * The unread count behind the bell's dot; polled once a minute and on window focus. `shell` is for the /ds shell: its one
 * combined poll (`useShellCounts`) loads and refreshes this entry, so this hook neither polls nor fetches until that has
 * answered (it then fetches only if the shell call left this entry empty).
 */
export function useNotificationSummary({ shell = false }: { shell?: boolean } = {}) {
  const shellCounts = useShellCounts({ enabled: shell });
  return useQuery({
    queryKey: keys.notifications.summary(),
    queryFn: async (): Promise<NotificationFeedSummary> => {
      return unwrapAction(loadNotificationSummary());
    },
    enabled: !shell || shellCounts.status !== 'pending',
    refetchInterval: shell ? false : 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: !shell,
  });
}

const NOTIFICATION_WRITE_KEY = ['notifications', 'write'] as const;

/** The mutations behind the bell and the page; each refreshes the feed and the unread count. */
export function useNotificationMutations() {
  const qc = useQueryClient();
  const router = useRouter();
  // One router refresh after the last overlapping write settles, and only if one succeeded: an earlier
  // refresh could resurrect a row another in-flight clear has optimistically hidden.
  const refreshDue = useRef(false);
  const settle = (_data: unknown, error: unknown) => {
    if (!error) refreshDue.current = true;
    if (qc.isMutating({ mutationKey: NOTIFICATION_WRITE_KEY }) <= 1 && refreshDue.current) {
      refreshDue.current = false;
      router.refresh();
    }
    return qc.invalidateQueries({ queryKey: keys.notifications.all });
  };

  const markRead = useMutation({
    mutationKey: NOTIFICATION_WRITE_KEY,
    mutationFn: (before?: string) => unwrapAction(markNotificationsRead(before)),
    onSettled: settle,
  });

  const clear = useMutation({
    mutationKey: NOTIFICATION_WRITE_KEY,
    mutationFn: (id: string) => unwrapAction(clearNotification(id)),
    onSettled: settle,
  });

  const restore = useMutation({
    mutationKey: NOTIFICATION_WRITE_KEY,
    mutationFn: (id: string) => unwrapAction(restoreNotification(id)),
    onSettled: settle,
  });

  const clearAll = useMutation({
    mutationKey: NOTIFICATION_WRITE_KEY,
    mutationFn: () => unwrapAction(clearAllNotifications()),
    onSettled: settle,
  });

  return { markRead, clear, restore, clearAll };
}
