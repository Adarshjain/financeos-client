import React from 'react';

import { RetirementScreen } from '@/features/investments/retirement/RetirementScreen';
import { loadRetirementScreen } from '@/features/investments/retirement/retirementScreenData';
import { LoadError } from '@/features/shell/LoadError';

/** /investments/retirement: one row per EPF and NPS account, read from the same summaries their own screens use. */
export default async function DsRetirementPage() {
  const result = await loadRetirementScreen();
  if (!result.ok) return <LoadError what="retirement" reference={result.reference} />;
  return <RetirementScreen model={result.data} />;
}
