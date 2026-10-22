'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

import { api } from '@/lib/api/client';
import type { NotificationFeedPage, NotificationFeedSummary } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

/** One page of the notification feed, newest first (page is 0-based). Refetches on window focus. */
export function useNotificationFeed(page: number, size: number) {
  return useQuery({
    queryKey: keys.notifications.feed(page, size),
    queryFn: async (): Promise<NotificationFeedPage> => {
      const { data } = await api.GET('/api/v1/notifications/feed', { params: { query: { page, size } } });
      return data as NotificationFeedPage;
    },
  });
}

/** The unread count behind the bell's dot; polled once a minute and on window focus. */
export function useNotificationSummary() {
  return useQuery({
    queryKey: keys.notifications.summary(),
    queryFn: async (): Promise<NotificationFeedSummary> => {
      const { data } = await api.GET('/api/v1/notifications/feed/summary');
      return data as NotificationFeedSummary;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
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
    mutationFn: (before?: string) =>
      api.POST('/api/v1/notifications/feed/read', { body: { before } }).then(() => undefined),
    onSettled: settle,
  });

  const clear = useMutation({
    mutationKey: NOTIFICATION_WRITE_KEY,
    mutationFn: (id: string) =>
      api.POST('/api/v1/notifications/feed/{id}/clear', { params: { path: { id } } }).then(() => undefined),
    onSettled: settle,
  });

  const restore = useMutation({
    mutationKey: NOTIFICATION_WRITE_KEY,
    mutationFn: (id: string) =>
      api.POST('/api/v1/notifications/feed/{id}/restore', { params: { path: { id } } }).then(() => undefined),
    onSettled: settle,
  });

  const clearAll = useMutation({
    mutationKey: NOTIFICATION_WRITE_KEY,
    mutationFn: async () => {
      const { data } = await api.POST('/api/v1/notifications/feed/clear');
      return (data as { cleared: number } | undefined)?.cleared ?? 0;
    },
    onSettled: settle,
  });

  return { markRead, clear, restore, clearAll };
}
