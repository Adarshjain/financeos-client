import React from 'react';

import { InvestmentsOverviewSkeleton } from '@/features/investments/overview/InvestmentsOverview';

/** Shown inside the Investments shell while the landing loads. */
export default function DsInvestmentsLandingLoading() {
  return <InvestmentsOverviewSkeleton />;
}
