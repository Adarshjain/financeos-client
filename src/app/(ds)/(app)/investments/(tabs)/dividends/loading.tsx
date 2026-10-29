import React from 'react';

import { DividendsListSkeleton } from '@/features/investments/dividends/DividendsListCard';

/** Shown inside the Investments shell while Dividends loads. */
export default function DsDividendsLoading() {
  return <DividendsListSkeleton />;
}
