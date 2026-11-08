import React from 'react';

import { InvestmentsShell } from '@/features/investments/InvestmentsShell';

export const metadata = { title: 'Investments' };

/** The Investments landing: the area's own page, with its + menu (record a trade, upload an EPF passbook or NPS statement). */
export default function DsInvestmentsLandingLayout({ children }: { children: React.ReactNode }) {
  return <InvestmentsShell>{children}</InvestmentsShell>;
}
