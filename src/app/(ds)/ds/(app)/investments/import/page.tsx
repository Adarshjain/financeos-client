import React from 'react';

import { ImportTradebookScreen } from '@/features/investments/import/ImportTradebookScreen';
import { fetchBrokers } from '@/features/investments/investmentsServerApi';
import { guardSession } from '@/features/shell/loadHelpers';
import { requireAuth } from '@/lib/auth';

/** /ds/investments/import: the broker accounts are read here, so the account list is there on the first paint. */
export default async function DsInvestmentsImportPage() {
  await requireAuth();
  const brokers = await guardSession(fetchBrokers());
  return <ImportTradebookScreen brokers={brokers} />;
}
