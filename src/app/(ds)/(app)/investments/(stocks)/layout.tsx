import React from 'react';

import { InvestmentsShell } from '@/features/investments/InvestmentsShell';

// The top bar reads "Stocks & funds" on every tab, so the tab title does too.
export const metadata = { title: 'Stocks & funds' };

export default function DsStocksLayout({ children }: { children: React.ReactNode }) {
  return <InvestmentsShell>{children}</InvestmentsShell>;
}
