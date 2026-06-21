import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { dashboardsApi } from '@/lib/apiClient';

import { DashboardsList } from './DashboardsList';

export default async function DashboardsPage() {
  const dashboards = await dashboardsApi.list();

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboards
        </h1>
        <Link href="/dashboards/new">
          <Button>
            <Plus className="h-4 w-4" />
            New dashboard
          </Button>
        </Link>
      </div>
      <DashboardsList dashboards={dashboards} />
    </div>
  );
}
