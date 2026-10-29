import React from 'react';

import { TradebookSkeleton } from '@/features/investments/tradebook/TradebookScreen';

/** Shown inside the Investments shell while the tradebook loads. */
export default function DsTradebookLoading() {
  return <TradebookSkeleton />;
}
