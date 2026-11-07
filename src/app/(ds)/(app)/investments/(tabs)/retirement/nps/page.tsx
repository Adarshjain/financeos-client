import React from 'react';

import { parseNpsUrl } from '@/features/investments/nps/npsModel';
import { NpsScreen } from '@/features/investments/nps/NpsScreen';
import { loadNpsScreen } from '@/features/investments/nps/npsScreenData';
import { LoadError } from '@/features/shell/LoadError';
import type { SearchParams } from '@/features/shell/searchParams';

/** /investments/retirement/nps. The account, tier, type and page are in the URL and answered by the server. */
export default async function DsNpsPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await loadNpsScreen(parseNpsUrl(await searchParams));
  if (!result.ok) return <LoadError what="NPS" reference={result.reference} />;
  return <NpsScreen {...result.data} />;
}
