import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { DashboardEditor } from '@/components/dashboards/DashboardEditor';
import { dashboardsApi, reportsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  // The list's Edit button links with ?edit=1 to open straight into edit mode.
  const startEditing = (await searchParams)?.edit === '1';
  const qc = getQueryClient();
  const [dashboard, reports] = await Promise.all([
    dashboardsApi.getById(id),
    reportsApi.list(),
    // The Add-widget dialog's built-in catalog; a failure only leaves it to load on the client.
    qc.prefetchQuery({ queryKey: keys.dashboards.builtins(), queryFn: () => dashboardsApi.builtins() }),
  ]);

  qc.setQueryData(keys.reports.list(), reports);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DashboardEditor key={id} mode="edit" dashboard={dashboard} startEditing={startEditing} />
    </HydrationBoundary>
  );
}
