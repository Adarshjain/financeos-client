import React from 'react';

import { RowsSkeleton } from '@/features/dashboards/builtins/BuiltinParts';

/** Cap rows: card and cap over a bar and its caption, a percent at the end. */
export function CapHeadroomSkeleton() {
  return <RowsSkeleton rows={3} bar />;
}
