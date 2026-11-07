import React from 'react';

import { InstrumentsShell } from '@/features/investments/instruments/InstrumentsShell';

export const metadata = { title: 'Instruments' };

export default function DsInstrumentsLayout({ children }: { children: React.ReactNode }) {
  return <InstrumentsShell>{children}</InstrumentsShell>;
}
