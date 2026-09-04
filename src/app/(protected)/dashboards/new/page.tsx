import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { DashboardEditor } from '@/components/dashboards/DashboardEditor';
import { reportsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export default async function NewDashboardPage() {
  const qc = getQueryClient();
  const reports = await reportsApi.list();
  qc.setQueryData(keys.reports.list(), reports);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DashboardEditor mode="create" />
    </HydrationBoundary>
  );
}
