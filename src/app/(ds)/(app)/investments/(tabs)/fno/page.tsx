import React from 'react';

import { parseFnoUrl } from '@/features/investments/fno/fnoModel';
import { FnoScreen } from '@/features/investments/fno/FnoScreen';
import { loadFnoScreen } from '@/features/investments/fno/fnoScreenData';
import { LoadError } from '@/features/shell/LoadError';
import type { SearchParams } from '@/features/shell/searchParams';

/** /investments/fno: F&O. The filters, FY, sort and page are in the URL and answered by the server. */
export default async function DsFnoPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await loadFnoScreen(parseFnoUrl(await searchParams));
  if (!result.ok) return <LoadError what="F&O trades" reference={result.reference} />;
  return <FnoScreen {...result.data} />;
}
