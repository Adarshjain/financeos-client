import type { DynamicOptions } from '@/components/reports/catalog';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import type { Account } from '@/lib/account.types';
import { accountsApi, categoriesApi, instrumentsApi, reportsApi } from '@/lib/apiClient';
import type { Category } from '@/lib/categories.types';
import type { Instrument } from '@/lib/types';

export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [report, catalog, categories, accounts, instruments] = await Promise.all([
    reportsApi.getById(id),
    reportsApi.getDatasource(),
    categoriesApi.list(),
    accountsApi.list(),
    instrumentsApi.search(),
  ]);

  const dynamicOptions: DynamicOptions = {
    category: categories.map((c: Category) => ({ id: c.id, name: c.name })),
    account: accounts.map((a: Account) => ({ id: a.id, name: a.name })),
    broker: accounts.filter((a: Account) => a.type === 'broker').map((a: Account) => ({ id: a.id, name: a.name })),
    instrument: instruments.map((i: Instrument) => ({ id: i.id, name: i.name })),
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
