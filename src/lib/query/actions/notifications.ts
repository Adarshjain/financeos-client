'use server';

import { serverApi } from '@/lib/api/server';
import type { NotificationFeedPage, NotificationFeedSummary } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';

export const loadNotificationFeed = createDomainAction(
  { fallbackError: "Couldn't load notifications. Try again." },
  async (page: number, size: number): Promise<NotificationFeedPage> => {
    const { data } = await serverApi.GET('/api/v1/notifications/feed', { params: { query: { page, size } } });
    return data as NotificationFeedPage;
  },
);

export const loadNotificationSummary = createDomainAction(
  { fallbackError: "Couldn't load notifications. Try again." },
  async (): Promise<NotificationFeedSummary> => {
    const { data } = await serverApi.GET('/api/v1/notifications/feed/summary');
    return data as NotificationFeedSummary;
  },
);

/** Marks the feed read (up to `before` when given). */
export const markNotificationsRead = createDomainAction(
  { fallbackError: "Couldn't mark notifications read. Try again." },
  async (before?: string): Promise<void> => {
    await serverApi.POST('/api/v1/notifications/feed/read', { body: { before } });
  },
);

export const clearNotification = createDomainAction(
  { fallbackError: "Couldn't clear the notification. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.POST('/api/v1/notifications/feed/{id}/clear', { params: { path: { id } } });
  },
);

export const restoreNotification = createDomainAction(
  { fallbackError: "Couldn't restore the notification. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.POST('/api/v1/notifications/feed/{id}/restore', { params: { path: { id } } });
  },
);

/** Clears the whole feed; returns how many were cleared. */
export const clearAllNotifications = createDomainAction(
  { fallbackError: "Couldn't clear notifications. Try again." },
  async (): Promise<number> => {
    const { data } = await serverApi.POST('/api/v1/notifications/feed/clear');
    return (data as { cleared: number } | undefined)?.cleared ?? 0;
  },
);
