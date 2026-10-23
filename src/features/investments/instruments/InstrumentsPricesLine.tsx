'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, showToast, Text } from '@/components/ds';

import { jobHref } from '../holdings/PricesLine';
import { type RefreshNotifier, useRefreshPrices } from '../useRefreshPrices';

/** Price-refresh progress goes to Dinero's own toasts. */
const notify: RefreshNotifier = {
  info: (message) => showToast(message),
  success: (message) => showToast(message, { tone: 'success' }),
  warning: (message) => showToast(message, { tone: 'warning', duration: 6000 }),
  error: (message) => showToast(message, { tone: 'danger' }),
};

/** "Prices from Yahoo (stocks, ETFs) and AMFI (funds) · Refresh prices · View job": Refresh starts the job and reports through toasts; View job is a permanent link to the exact job. */
export function InstrumentsPricesLine({ latestJobId }: { latestJobId: string | null }) {
  const router = useRouter();
  const { refresh, busy, jobId } = useRefreshPrices({ notify, onSettled: () => router.refresh() });
  const viewJob = jobId ?? latestJobId;
  return (
    <Text variant="caption" tone="ink-3" as="div">
      {'Prices from Yahoo (stocks, ETFs) and AMFI (funds) · '}
      <Button variant="link" size="sm" loading={busy} loadingLabel="Refreshing" onClick={() => void refresh()}>
        Refresh prices
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
