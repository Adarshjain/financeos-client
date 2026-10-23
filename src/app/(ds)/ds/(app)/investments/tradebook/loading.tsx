import React from 'react';

import { TradebookSkeleton } from '@/features/investments/tradebook/TradebookView';

/** Shown inside the Investments shell while the tradebook loads. */
export default function DsTradebookLoading() {
  return <TradebookSkeleton />;
}
