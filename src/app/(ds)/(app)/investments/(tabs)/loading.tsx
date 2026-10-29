import React from 'react';

import { HoldingsSkeleton } from '@/features/investments/holdings/HoldingsSkeleton';

/** Shown inside the Investments shell while Holdings loads. */
export default function DsInvestmentsLoading() {
  return <HoldingsSkeleton />;
}
