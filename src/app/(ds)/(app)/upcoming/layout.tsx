import React from 'react';

import { UpcomingShell } from '@/features/upcoming/UpcomingShell';

export default function DsUpcomingLayout({ children }: { children: React.ReactNode }) {
  return <UpcomingShell>{children}</UpcomingShell>;
}
