import React from 'react';

import { LoansLendingsShell } from '@/features/loans/LoansLendingsShell';

export default function DsLoansLayout({ children }: { children: React.ReactNode }) {
  return <LoansLendingsShell>{children}</LoansLendingsShell>;
}
