import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { accountsApi, reportsApi,tagsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function NewReportPage() {
  const qc = getQueryClient();
  const [catalog, categories, accounts] = await Promise.all([
    reportsApi.getDatasource(),
    tagsApi.list().catch(() => []),
    accountsApi.list().catch(() => []),
  ]);

  qc.setQueryData(keys.tags.list(), categories);
  qc.setQueryData(keys.accounts.list(), accounts);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ReportBuilder
        mode="create"
        catalog={catalog}
      />
    </HydrationBoundary>
  );
}
