import { accountsApi } from '@/lib/apiClient';

import { IngestForm } from './IngestForm';

export default async function IngestPage() {
  const accounts = await accountsApi.list();

  return <IngestForm accounts={accounts} />;
}
