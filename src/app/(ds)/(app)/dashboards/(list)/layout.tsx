import React from 'react';

import { DashboardsShell } from '@/features/dashboards/list/DashboardsShell';

export default function DsDashboardsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardsShell>{children}</DashboardsShell>;
}
