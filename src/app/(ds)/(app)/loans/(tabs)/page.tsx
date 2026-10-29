import React from 'react';

import { parseLoansUrl } from '@/features/loans/list/loansList';
import { LoansScreen } from '@/features/loans/list/LoansScreen';
import { loadLoansScreen } from '@/features/loans/list/loansScreenData';
import type { SearchParams } from '@/features/shell/searchParams';

export const metadata = { title: 'Loans & lendings' };

/** /loans: the active loans. Search and page are in the URL and answered by the server. */
export default async function DsLoansPage({ searchParams }: { searchParams: SearchParams }) {
  const props = await loadLoansScreen(parseLoansUrl(await searchParams));
  return <LoansScreen {...props} />;
}
