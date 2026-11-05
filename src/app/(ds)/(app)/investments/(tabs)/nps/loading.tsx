import React from 'react';

import { NpsEntriesSkeleton } from '@/features/investments/nps/NpsEntriesCard';

/** Shown inside the Investments shell while NPS loads. */
export default function DsNpsLoading() {
  return <NpsEntriesSkeleton />;
}
