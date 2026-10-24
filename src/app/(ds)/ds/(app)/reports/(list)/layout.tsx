import React from 'react';

import { ReportsShell } from '@/features/reports/list/ReportsShell';

export default function DsReportsLayout({ children }: { children: React.ReactNode }) {
  return <ReportsShell>{children}</ReportsShell>;
}
