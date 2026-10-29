import React from 'react';

import { parseEpfUrl } from '@/features/investments/epf/epfModel';
import { loadEpfScreen } from '@/features/investments/epf/epfScreenData';
import { EpfView } from '@/features/investments/epf/EpfView';
import { LoadError } from '@/features/shell/LoadError';
import type { SearchParams } from '@/features/shell/searchParams';

/** /investments/epf. The FY, employer and page are in the URL and answered by the server. */
export default async function DsEpfPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await loadEpfScreen(parseEpfUrl(await searchParams));
  if (!result.ok) return <LoadError what="EPF" reference={result.reference} />;
  return <EpfView {...result.data} />;
}
