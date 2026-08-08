import type { DynamicOptions } from '@/components/reports/catalog';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import type { Account } from '@/lib/account.types';
import { accountsApi, categoriesApi, instrumentsApi, reportsApi } from '@/lib/apiClient';
import type { Category } from '@/lib/categories.types';
import type { Instrument } from '@/lib/types';

export default async function NewReportPage() {
  const [catalog, categories, accounts, instruments] = await Promise.all([
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
      mode="create"
      catalog={catalog}
      dynamicOptions={dynamicOptions}
    />
  );
}
