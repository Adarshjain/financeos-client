import React from 'react';

import { RowsSkeleton } from '@/features/dashboards/builtins/BuiltinParts';

/** Card rows: a name over a thin bar, a percent at the end. */
export function CardUtilisationSkeleton() {
  return <RowsSkeleton rows={3} bar />;
}
