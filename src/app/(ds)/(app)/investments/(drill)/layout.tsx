import React from 'react';

import { InvestmentsShell } from '@/features/investments/InvestmentsShell';

export const metadata = { title: 'Investments' };

/** EPF and NPS: drill-ins of the Investments landing, each under its own name with back to the landing and no tab strip. */
export default function DsInvestmentsDrillLayout({ children }: { children: React.ReactNode }) {
  return <InvestmentsShell>{children}</InvestmentsShell>;
}
