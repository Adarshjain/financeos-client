import React from 'react';

import { parseDividendsUrl } from '@/features/investments/dividends/dividendsModel';
import { loadDividendsScreen } from '@/features/investments/dividends/dividendsScreenData';
import { DividendsView } from '@/features/investments/dividends/DividendsView';
import { LoadError } from '@/features/shell/LoadError';
import type { SearchParams } from '@/features/shell/searchParams';

/** /investments/dividends. The FY, filters and pages are in the URL and answered by the server. */
export default async function DsDividendsPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await loadDividendsScreen(parseDividendsUrl(await searchParams));
  if (!result.ok) return <LoadError what="dividends" reference={result.reference} />;
  return <DividendsView {...result.data} />;
}
