import React from 'react';

import { ImportTradebookScreen } from '@/features/investments/import/ImportTradebookScreen';
import { parseImportUrl } from '@/features/investments/import/importUrl';
import { fetchBrokers } from '@/features/investments/investmentsServerApi';
import { guardSession } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import { requireAuth } from '@/lib/auth';

export const metadata = { title: 'Import tradebook' };

/** /investments/import: the broker accounts are read here, so the account list is there on the first paint. `?type=epf` opens on the EPF passbook. */
export default async function DsInvestmentsImportPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuth();
  const { initialMode } = parseImportUrl(await searchParams);
  const brokers = await guardSession(fetchBrokers());
  return <ImportTradebookScreen brokers={brokers} initialMode={initialMode} />;
}
