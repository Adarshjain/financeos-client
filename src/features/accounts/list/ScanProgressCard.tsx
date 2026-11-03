'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { Text } from '@/components/ds/Text/Text';
import type { ScanState } from '@/features/accounts/list/suggestionsModel';

import { loadScanState } from './suggestionActions';
import { isScanProgressShown, scanProgressLine, scanProgressValue } from './suggestionsModel';

const POLL_MS = 5000;

/**
 * "Finding your accounts": how far the first Gmail scan has read. It asks for progress every 5 seconds while the
 * page is visible, and refreshes the page once the scan is done so the suggestions appear.
 */
export function ScanProgressCard({ scan: initial, className }: { scan: ScanState; className?: string }) {
  const router = useRouter();
  const [scan, setScan] = React.useState(initial);
  const shown = isScanProgressShown(scan);

  React.useEffect(() => setScan(initial), [initial]);

  React.useEffect(() => {
    if (!shown) return;
    let stopped = false;
    // One request at a time: a reply slower than the interval must not overlap the next tick (and refresh twice).
    let busy = false;
    const tick = async () => {
      if (document.hidden || busy) return;
      busy = true;
      try {
        const result = await loadScanState();
        if (stopped || !result.success) return;
        setScan(result.data);
        if (result.data.firstScanDone) {
          stopped = true;
          router.refresh();
        }
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [shown, router]);

  if (!shown) return null;
  return (
    <Card title="Finding your accounts" className={className} data-testid="scan-progress">
      <Card.Row className="flex-col items-stretch">
        <Text variant="body">{scanProgressLine(scan)}</Text>
        <Text variant="body" tone="ink-3">
          Keep using FinanceOS. We&apos;ll let you know what we find.
        </Text>
        <ProgressBar value={scanProgressValue(scan)} />
      </Card.Row>
    </Card>
  );
}
