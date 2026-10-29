import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { NotificationsSettings } from '@/features/settings/notifications/NotificationsSettings';
import { accountsApi, notificationsApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Notifications' };

export default async function DsSettingsNotificationsPage() {
  await requireAuth();

  const [settings, accounts] = await Promise.all([notificationsApi.getSettings(), accountsApi.list()]);

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.settings.notifications(), settings);
  queryClient.setQueryData(keys.accounts.list(), accounts);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotificationsSettings />
    </HydrationBoundary>
  );
}
