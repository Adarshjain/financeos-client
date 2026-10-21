import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { NOTIFICATIONS_PAGE_SIZE, parsePage } from '@/features/notifications/notificationsModel';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { notificationFeedApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function DsNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params?.page;
  const page = parsePage(`page=${(Array.isArray(raw) ? raw[0] : raw) ?? ''}`);

  // A failed prefetch is not fatal: the page loads (and reports errors) on the client.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: keys.notifications.feed(page, NOTIFICATIONS_PAGE_SIZE),
    queryFn: () => notificationFeedApi.feed(page, NOTIFICATIONS_PAGE_SIZE),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotificationsPage />
    </HydrationBoundary>
  );
}
