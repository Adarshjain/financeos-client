import React from 'react';

import { LendingShell } from '@/features/lendings/LendingShell';

export default function DsLendingLayout({ children }: { children: React.ReactNode }) {
  return <LendingShell>{children}</LendingShell>;
}
