import React from 'react';

import { CorporateActionsSkeleton } from '@/features/investments/corporate-actions/CorporateActionsList';

/** Shown inside the Investments shell while the Corporate actions page loads. */
export default function DsCorporateActionsLoading() {
  return <CorporateActionsSkeleton />;
}
