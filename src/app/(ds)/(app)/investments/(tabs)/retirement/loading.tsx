import React from 'react';

import { RetirementSkeleton } from '@/features/investments/retirement/RetirementScreen';

/** Shown inside the Investments shell while Retirement loads. */
export default function DsRetirementLoading() {
  return <RetirementSkeleton />;
}
