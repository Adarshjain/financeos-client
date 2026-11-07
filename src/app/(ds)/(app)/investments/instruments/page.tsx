import React from 'react';

import { parseInstrumentsUrl } from '@/features/investments/instruments/instrumentsModel';
import { InstrumentsScreen } from '@/features/investments/instruments/InstrumentsScreen';
import { loadInstrumentsScreen } from '@/features/investments/instruments/instrumentsScreenData';
import { LoadError } from '@/features/shell/LoadError';
import type { SearchParams } from '@/features/shell/searchParams';

/** /investments/instruments: the catalog. Search, type, stale, name order and page are in the URL and answered by the server. */
export default async function DsInstrumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await loadInstrumentsScreen(parseInstrumentsUrl(await searchParams));
  if (!result.ok) return <LoadError what="instruments" reference={result.reference} />;
  return <InstrumentsScreen {...result.data} />;
}
