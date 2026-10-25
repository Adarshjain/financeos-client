'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, showToast, Text } from '@/components/ds';
import { appHref } from '@/features/shell/routes';

import { type RefreshNotifier, useRefreshPrices } from '../useRefreshPrices';

/** Price-refresh progress goes to Dinero's own toasts. */
const notify: RefreshNotifier = {
  info: (message) => showToast(message),
  success: (message) => showToast(message, { tone: 'success' }),
  warning: (message) => showToast(message, { tone: 'warning', duration: 6000 }),
  error: (message) => showToast(message, { tone: 'danger' }),
};

/** Where one job is shown: Settings → Activity, opened on that job. */
export function jobHref(jobId: string): string {
  return appHref(`/settings/activity?job=${encodeURIComponent(jobId)}`);
}

export interface PricesLineProps {
  /** "13 Oct", or null when no price is known. */
  asOf: string | null;
  /** The whole wording when the price has a time ("Live · 11:45"); asOf is used when absent. */
  label?: string | null;
  /** The newest price-refresh job on record. */
  latestJobId: string | null;
}

/** "Prices as of 13 Oct · Refresh · View job": Refresh starts the job and reports through toasts; View job is a permanent link to the exact job. */
export function PricesLine({ asOf, label, latestJobId }: PricesLineProps) {
  const router = useRouter();
  const { refresh, busy, jobId } = useRefreshPrices({ notify, onSettled: () => router.refresh() });
  const viewJob = jobId ?? latestJobId;
  return (
    <Text variant="caption" tone="ink-3" as="div">
      {label ? `${label} · ` : asOf ? `Prices as of ${asOf} · ` : 'No prices yet · '}
      <Button variant="link" size="sm" loading={busy} loadingLabel="Refreshing" onClick={() => void refresh()}>
        Refresh
      </Button>
      {viewJob ? (
        <>
          {' · '}
          <Button asChild variant="link" size="sm">
            <Link href={jobHref(viewJob)}>View job</Link>
          </Button>
        </>
      ) : null}
    </Text>
  );
}
