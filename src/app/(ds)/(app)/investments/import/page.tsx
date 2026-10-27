import React from 'react';

import { ImportTradebookScreen } from '@/features/investments/import/ImportTradebookScreen';
import { fetchBrokers } from '@/features/investments/investmentsServerApi';
import { guardSession } from '@/features/shell/loadHelpers';
import { requireAuth } from '@/lib/auth';

/** /investments/import: the broker accounts are read here, so the account list is there on the first paint. `?type=epf` opens on the EPF passbook. */
export default async function DsInvestmentsImportPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAuth();
  const { type } = await searchParams;
  const brokers = await guardSession(fetchBrokers());
  return <ImportTradebookScreen brokers={brokers} initialMode={type === 'epf' ? 'epf_passbook' : undefined} />;
}
