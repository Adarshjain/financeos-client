import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { DashboardEditor } from '@/components/dashboards/DashboardEditor';
import { dashboardsApi, reportsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const qc = getQueryClient();
  const [dashboard, reports] = await Promise.all([
    dashboardsApi.getById(id),
    reportsApi.list(),
  ]);

  qc.setQueryData(keys.reports.list(), reports);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DashboardEditor mode="edit" dashboard={dashboard} />
    </HydrationBoundary>
  );
}
