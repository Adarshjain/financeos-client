import React from 'react';

import { InboxSkeleton } from '@/features/inbox/InboxSkeleton';

/** Shown inside the Inbox · Upcoming shell while the inbox loads. */
export default function DsInboxLoading() {
  return <InboxSkeleton />;
}
