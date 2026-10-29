import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { NotificationsSettings } from '@/features/settings/notifications/NotificationsSettings';
import { guardSession } from '@/features/shell/loadHelpers';
import { accountsApi, notificationsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Notifications' };

export default async function DsSettingsNotificationsPage() {
  const [settings, accounts] = await guardSession(
    Promise.all([notificationsApi.getSettings(), accountsApi.list()]),
  );

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.settings.notifications(), settings);
  queryClient.setQueryData(keys.accounts.list(), accounts);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotificationsSettings />
    </HydrationBoundary>
  );
}
