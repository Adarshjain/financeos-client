import React from 'react';

import { Text } from '@/components/ds/Text/Text';
import { appHref } from '@/features/shell/routes';

/** Where one job is shown: Settings → Activity, opened on that job. */
export function jobHref(jobId: string): string {
  return appHref(`/settings/activity?job=${encodeURIComponent(jobId)}`);
}

export interface PricesLineProps {
  /** "13 Oct", or null when no price is known. */
  asOf: string | null;
  /** The whole wording when the price has a time ("Live · 11:45 am"); asOf is used when absent. */
  label?: string | null;
}

/** "Prices as of 13 Oct": prices update on their own, so there is no refresh control. */
export function PricesLine({ asOf, label }: PricesLineProps) {
  return (
    <Text variant="caption" tone="ink-3" as="div">
      {label ?? (asOf ? `Prices as of ${asOf}` : 'No prices yet')}
    </Text>
  );
}
