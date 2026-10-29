import React from 'react';

import { NotificationsPageSkeleton } from '@/features/notifications/NotificationsSkeleton';

/** Shown while the first page of notifications loads. */
export default function DsNotificationsLoading() {
  return <NotificationsPageSkeleton />;
}
