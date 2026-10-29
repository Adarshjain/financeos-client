import React from 'react';

import { InvestmentsShell } from '@/features/investments/InvestmentsShell';

// The top bar reads "Investments" on every tab, so the tab title does too.
export const metadata = { title: 'Investments' };

export default function DsInvestmentsLayout({ children }: { children: React.ReactNode }) {
  return <InvestmentsShell>{children}</InvestmentsShell>;
}
