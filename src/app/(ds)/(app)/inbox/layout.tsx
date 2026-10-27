import React from 'react';

import { InboxUpcomingShell } from '@/features/inbox/InboxUpcomingShell';

export default function DsInboxLayout({ children }: { children: React.ReactNode }) {
  return <InboxUpcomingShell>{children}</InboxUpcomingShell>;
}
