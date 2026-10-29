import React from 'react';

import { FnoListSkeleton } from '@/features/investments/fno/FnoListCard';

/** Shown inside the Investments shell while F&O loads. */
export default function DsFnoLoading() {
  return <FnoListSkeleton />;
}
