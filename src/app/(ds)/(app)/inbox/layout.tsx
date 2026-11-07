import React from 'react';

import { InboxShell } from '@/features/inbox/InboxShell';

export default function DsInboxLayout({ children }: { children: React.ReactNode }) {
  return <InboxShell>{children}</InboxShell>;
}
