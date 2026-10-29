import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { NOTIFICATIONS_PAGE_SIZE } from '@/features/notifications/notificationsModel';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import { parsePage } from '@/features/shell/pagination';
import type { SearchParams } from '@/features/shell/searchParams';
import { notificationFeedApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Notifications' };

export default async function DsNotificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page } = parsePage(await searchParams);

  // A failed prefetch is not fatal: the page loads (and reports errors) on the client.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: keys.notifications.feed(page, NOTIFICATIONS_PAGE_SIZE),
    queryFn: () => notificationFeedApi.feed(page, NOTIFICATIONS_PAGE_SIZE),
  });
  await signInIfPrefetchFailed(queryClient, keys.notifications.feed(page, NOTIFICATIONS_PAGE_SIZE));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotificationsPage />
    </HydrationBoundary>
  );
}
