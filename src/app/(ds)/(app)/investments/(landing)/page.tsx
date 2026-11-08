import React from 'react';

import { InvestmentsOverview } from '@/features/investments/overview/InvestmentsOverview';
import { loadInvestmentsOverview } from '@/features/investments/overview/overviewData';

/** /investments: one card per product (Stocks & funds, EPF, each NPS account). A product that fails to load is its own error card. */
export default async function DsInvestmentsLandingPage() {
  return <InvestmentsOverview cards={await loadInvestmentsOverview()} />;
}
