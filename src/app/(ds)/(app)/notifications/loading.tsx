import React from 'react';

import { NotificationsSkeleton } from '@/features/notifications/NotificationsSkeleton';
import { ShellPage } from '@/features/shell/ShellPage';

/** Shown while the first page of notifications loads. */
export default function DsNotificationsLoading() {
  return (
    <ShellPage title="Notifications">
      <NotificationsSkeleton />
    </ShellPage>
  );
}
