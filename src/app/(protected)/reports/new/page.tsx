import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { accountsApi, categoriesApi, instrumentsApi, reportsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function NewReportPage() {
  const qc = getQueryClient();
  const [catalog, categories, accounts, instruments] = await Promise.all([
    reportsApi.getDatasource(),
    categoriesApi.list().catch(() => []),
    accountsApi.list().catch(() => []),
    instrumentsApi.search().catch(() => []),
  ]);

  qc.setQueryData(keys.categories.list(), categories);
  qc.setQueryData(keys.accounts.list(), accounts);
  qc.setQueryData(keys.investments.instruments(), instruments);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ReportBuilder
        mode="create"
        catalog={catalog}
      />
    </HydrationBoundary>
  );
}
