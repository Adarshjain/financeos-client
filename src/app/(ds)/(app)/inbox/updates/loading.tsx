import React from 'react';

import { NotificationsPageSkeleton } from '@/features/notifications/NotificationsSkeleton';

/** Shown inside the Inbox shell while the first page of updates loads. */
export default function DsNotificationsLoading() {
  return <NotificationsPageSkeleton />;
}
