import React from 'react';

import { LoansSkeleton } from '@/features/loans/list/LoansSkeleton';

/** Shown inside the Loans shell while the loans load. */
export default function DsLoansLoading() {
  return <LoansSkeleton />;
}
