import React from 'react';

import { parseHoldingsUrl } from '@/features/investments/holdings/holdingsModel';
import { HoldingsScreen } from '@/features/investments/holdings/HoldingsScreen';
import { loadHoldingsScreen } from '@/features/investments/holdings/holdingsScreenData';
import { LoadError } from '@/features/shell/LoadError';
import type { SearchParams } from '@/features/shell/searchParams';

/** /investments: Holdings. The filters, sort and page are in the URL and answered by the server. */
export default async function DsInvestmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await loadHoldingsScreen(parseHoldingsUrl(await searchParams));
  if (!result.ok) return <LoadError what="holdings" reference={result.reference} />;
  return <HoldingsScreen {...result.data} />;
}
