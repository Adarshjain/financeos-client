import React from 'react';

import { UpcomingSkeleton } from '@/features/upcoming/UpcomingSkeleton';

export default function DsUpcomingLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <UpcomingSkeleton />
    </div>
  );
}
