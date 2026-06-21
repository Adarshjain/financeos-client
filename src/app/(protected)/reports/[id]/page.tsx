import type { DynamicOptions } from '@/components/reports/catalog';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { accountsApi, categoriesApi, reportsApi } from '@/lib/apiClient';

export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [report, catalog, categories, accounts] = await Promise.all([
    reportsApi.getById(id),
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
      mode="edit"
      report={report}
      catalog={catalog}
      dynamicOptions={dynamicOptions}
    />
  );
}
