import type { Metadata } from 'next';
import React from 'react';

import { loadPerson, loadPersonPage } from '@/features/lendings/person/personData';
import { parsePersonUrl } from '@/features/lendings/person/personModel';
import { PersonScreen } from '@/features/lendings/person/PersonScreen';
import { first, type SearchParams } from '@/features/shell/searchParams';
import { requireAuth } from '@/lib/auth';
import { todayInAppZone } from '@/lib/date-range';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: (await loadPerson((await params).id)).name };
}

/**
 * /loans/lendings/[id]: one person's ledger. The page and size are in the URL and answered by the server.
 * `?export=1` (from the "money due back" push) opens Export ledger on load.
 */
export default async function DsPersonPage({ params, searchParams }: Params & { searchParams: SearchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const [user, { cp, ledger, state }] = await Promise.all([
    requireAuth(),
    loadPersonPage(id, parsePersonUrl(query)),
  ]);
  return (
    <PersonScreen
      cp={cp}
      ledger={ledger}
      state={state}
      today={todayInAppZone()}
      myName={user.displayName ?? null}
      openExport={first(query.export) === '1'}
    />
  );
}
