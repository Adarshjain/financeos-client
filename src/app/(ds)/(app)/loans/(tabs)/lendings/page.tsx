import React from 'react';

import { parseLendingsUrl } from '@/features/lendings/list/lendingsListModel';
import { LendingsScreen } from '@/features/lendings/list/LendingsScreen';
import { loadLendingsScreen } from '@/features/lendings/list/lendingsScreenData';
import type { SearchParams } from '@/features/shell/searchParams';

export const metadata = { title: 'Lendings' };

/** /loans/lendings: the people ledger. Search, filter and page are in the URL and answered by the server. */
export default async function DsLendingsPage({ searchParams }: { searchParams: SearchParams }) {
  const props = await loadLendingsScreen(parseLendingsUrl(await searchParams));
  return <LendingsScreen {...props} />;
}
