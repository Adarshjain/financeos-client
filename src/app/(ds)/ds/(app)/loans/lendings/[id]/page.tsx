import React from 'react';

import { loadPersonPage } from '@/features/lendings/person/personData';
import { parsePersonUrl } from '@/features/lendings/person/personModel';
import { PersonView } from '@/features/lendings/person/PersonView';
import { requireAuth } from '@/lib/auth';
import { todayInAppZone } from '@/lib/date-range';

type SearchParams = { page?: string; size?: string; export?: string };

/**
 * /ds/loans/lendings/[id]: one person's ledger. The page and size are in the URL and answered by the server.
 * `?export=1` (from the "money due back" push) opens Export ledger on load.
 */
export default async function DsPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [user, { cp, ledger, state }] = await Promise.all([
    requireAuth(),
    loadPersonPage(id, parsePersonUrl(query)),
  ]);
  return (
    <PersonView
      cp={cp}
      ledger={ledger}
      state={state}
      today={todayInAppZone()}
      myName={user.displayName ?? null}
      openExport={query.export === '1'}
    />
  );
}
