import React from 'react';

import { parseTradebookUrl } from '@/features/investments/tradebook/tradebookModel';
import { loadTradebookScreen } from '@/features/investments/tradebook/tradebookScreenData';
import { TradebookView } from '@/features/investments/tradebook/TradebookView';
import { LoadError } from '@/features/shell/LoadError';
import type { SearchParams } from '@/features/shell/searchParams';

/** /investments/tradebook: the paged tradebook. The search, filters and page are in the URL and answered by the server. */
export default async function DsTradebookPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await loadTradebookScreen(parseTradebookUrl(await searchParams));
  if (!result.ok) return <LoadError what="trades" reference={result.reference} />;
  return <TradebookView {...result.data} />;
}
