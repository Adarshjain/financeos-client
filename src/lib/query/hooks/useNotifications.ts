'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

/** The mutations behind the bell and the page; each refreshes the feed and the unread count. */
export function useNotificationMutations() {
  const qc = useQueryClient();
  const settle = () => qc.invalidateQueries({ queryKey: keys.notifications.all });

  const markRead = useMutation({
    mutationFn: (before?: string) =>
      api.POST('/api/v1/notifications/feed/read', { body: { before } }).then(() => undefined),
    onSettled: settle,
  });

  const clear = useMutation({
    mutationFn: (id: string) =>
      api.POST('/api/v1/notifications/feed/{id}/clear', { params: { path: { id } } }).then(() => undefined),
    onSettled: settle,
  });

  const restore = useMutation({
    mutationFn: (id: string) =>
      api.POST('/api/v1/notifications/feed/{id}/restore', { params: { path: { id } } }).then(() => undefined),
    onSettled: settle,
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { data } = await api.POST('/api/v1/notifications/feed/clear');
      return (data as { cleared: number } | undefined)?.cleared ?? 0;
    },
    onSettled: settle,
  });

  return { markRead, clear, restore, clearAll };
}
