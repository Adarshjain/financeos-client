import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { accountsApi, notificationsApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';
import { getQueryClient, keys } from '@/lib/query';

import { NotificationsSettings } from './NotificationsSettings';

export default async function NotificationsSettingsPage() {
  await requireAuth();

  const [settings, accounts] = await Promise.all([notificationsApi.getSettings(), accountsApi.list()]);

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.settings.notifications(), settings);
  queryClient.setQueryData(keys.accounts.list(), accounts);

  return (
    <div className="space-y-4 p-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button asChild size="icon-sm" variant="ghost">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <NotificationsSettings />
      </HydrationBoundary>
    </div>
  );
}
