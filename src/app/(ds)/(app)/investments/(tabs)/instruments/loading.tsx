import React from 'react';

import { InstrumentsListSkeleton } from '@/features/investments/instruments/InstrumentsListCard';

/** Shown inside the Investments shell while Instruments loads. */
export default function DsInstrumentsLoading() {
  return <InstrumentsListSkeleton />;
}
