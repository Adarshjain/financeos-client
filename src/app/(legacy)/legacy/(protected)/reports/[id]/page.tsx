import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { accountsApi, reportsApi,tagsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const qc = getQueryClient();
  const [report, catalog, categories, accounts] = await Promise.all([
    reportsApi.getById(id),
    reportsApi.getDatasource(),
    tagsApi.list().catch(() => []),
    accountsApi.list().catch(() => []),
  ]);

  qc.setQueryData(keys.tags.list(), categories);
  qc.setQueryData(keys.accounts.list(), accounts);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ReportBuilder
        mode="edit"
        report={report}
        catalog={catalog}
      />
    </HydrationBoundary>
  );
}
