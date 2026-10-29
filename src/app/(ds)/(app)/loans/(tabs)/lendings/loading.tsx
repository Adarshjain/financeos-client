import React from 'react';

import { LendingsSkeleton } from '@/features/lendings/list/LendingsSkeleton';

/** Shown inside the Loans & lendings shell while the Lendings tab loads. */
export default function DsLendingsLoading() {
  return <LendingsSkeleton />;
}
