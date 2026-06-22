import { LayoutDashboard, Plus } from 'lucide-react';
import Link from 'next/link';

import { DashboardHome } from '@/components/dashboards/DashboardHome';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError, dashboardsApi } from '@/lib/apiClient';
import type { DashboardResponse } from '@/lib/dashboards.types';

// Landing view: show the user's default dashboard. There's no default-dashboard
// endpoint failure mode other than "none set" (404) that we handle inline; any
// other error propagates to the route error boundary.
async function loadDashboards(): Promise<DashboardResponse[] | null> {
  try {
    return await dashboardsApi.list();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export default async function DashboardPage() {
  const dashboards = await loadDashboards();
  const defaultDashboard = dashboards?.find(d => d.isDefault) ?? dashboards?.[0];

  if (!defaultDashboard) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Welcome back to your finance overview
          </p>
        </div>

        <Card>
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
              <LayoutDashboard className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              You don&apos;t have a default dashboard yet
            </p>
            <p className="max-w-md text-sm text-slate-500">
              Create a dashboard and mark it as default to see it here, or pick
              one from your existing dashboards.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link href="/dashboards/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create dashboard
                </Button>
              </Link>
              <Link href="/dashboards">
                <Button variant="secondary">View dashboards</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const fullDashboard = await dashboardsApi.getById(defaultDashboard.id);

  return (
    <DashboardHome dashboards={dashboards ?? []} />
  );
}
