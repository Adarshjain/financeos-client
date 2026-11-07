import React from 'react';

import { LoansShell } from '@/features/loans/LoansShell';

export default function DsLoansLayout({ children }: { children: React.ReactNode }) {
  return <LoansShell>{children}</LoansShell>;
}
