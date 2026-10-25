import React from 'react';

import { RowsSkeleton } from '../BuiltinParts';

/** Milestone rows: card and milestone over a bar and its caption, a percent at the end. */
export function MilestoneProgressSkeleton() {
  return <RowsSkeleton rows={3} bar />;
}
