import React from 'react';

import { EpfPassbookSkeleton } from '@/features/investments/epf/EpfPassbookCard';

/** Shown inside the Investments shell while EPF loads. */
export default function DsEpfLoading() {
  return <EpfPassbookSkeleton />;
}
