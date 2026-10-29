import React from 'react';

import { LoansSkeleton } from '@/features/loans/list/LoansSkeleton';

/** Shown inside the Loans & lendings shell while the Loans tab loads. */
export default function DsLoansLoading() {
  return <LoansSkeleton />;
}
