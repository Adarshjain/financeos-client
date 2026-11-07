import React from 'react';

import { LendingsSkeleton } from '@/features/lendings/list/LendingsSkeleton';

/** Shown inside the Lending shell while the people ledger loads. */
export default function DsLendingsLoading() {
  return <LendingsSkeleton />;
}
