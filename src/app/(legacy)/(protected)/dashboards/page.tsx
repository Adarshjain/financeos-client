import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';

import { RestoreHomeButton } from '@/components/dashboards/RestoreHomeButton';
import { Button } from '@/components/ui/button';
import { dashboardsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

import { DashboardsList } from './DashboardsList';

export default async function DashboardsPage() {
  const dashboards = await dashboardsApi.list();
  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.dashboards.list(), dashboards);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dashboards
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {!dashboards.some((d) => d.name === 'Home') && <RestoreHomeButton variant="secondary" />}
            <Link href="/dashboards/new">
              <Button>
                <Plus className="h-4 w-4" />
                New dashboard
              </Button>
            </Link>
          </div>
        </div>
        <DashboardsList />
      </div>
    </HydrationBoundary>
  );
}
