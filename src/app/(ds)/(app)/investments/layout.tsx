import React from 'react';

import { InvestmentsShell } from '@/features/investments/InvestmentsShell';

export default function DsInvestmentsLayout({ children }: { children: React.ReactNode }) {
  return <InvestmentsShell>{children}</InvestmentsShell>;
}
