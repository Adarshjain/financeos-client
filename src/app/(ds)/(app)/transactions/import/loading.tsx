import React from 'react';

import { ImportSkeleton } from '@/features/transactions/import/ImportSkeleton';

/** Shown while the Import tab loads. */
export default function DsImportLoading() {
  return <ImportSkeleton />;
}
