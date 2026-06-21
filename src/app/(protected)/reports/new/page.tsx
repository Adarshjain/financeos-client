import type { DynamicOptions } from '@/components/reports/catalog';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { accountsApi, categoriesApi, reportsApi } from '@/lib/apiClient';

export default async function NewReportPage() {
  const [catalog, categories, accounts] = await Promise.all([
    reportsApi.getDatasource(),
    categoriesApi.list(),
    accountsApi.list(),
  ]);

  const dynamicOptions: DynamicOptions = {
    category: categories.map((c) => ({ id: c.id, name: c.name })),
    account: accounts.map((a) => ({ id: a.id, name: a.name })),
  };

  return (
    <ReportBuilder
      mode="create"
      catalog={catalog}
      dynamicOptions={dynamicOptions}
    />
  );
}
