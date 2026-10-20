import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { DashboardEditor } from '@/components/dashboards/DashboardEditor';
import { dashboardsApi, reportsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export default async function NewDashboardPage() {
  const qc = getQueryClient();
  const [reports] = await Promise.all([
    reportsApi.list(),
    // The Add-widget dialog's built-in catalog; a failure only leaves it to load on the client.
    qc.prefetchQuery({ queryKey: keys.dashboards.builtins(), queryFn: () => dashboardsApi.builtins() }),
  ]);
  qc.setQueryData(keys.reports.list(), reports);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DashboardEditor key="new" mode="create" />
    </HydrationBoundary>
  );
}
