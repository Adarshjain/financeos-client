'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';

import { detectionDetails, importingMessage, type NpsDetection } from './npsGmailModel';
import { useNpsMutations } from './useNpsMutations';

/** An account found in Gmail: nothing is imported until the user says whose it is (or ignores it). */
function DetectedAccount({ detection }: { detection: NpsDetection }) {
  const { addDetection, ignoreDetection, refresh, refreshAfterImport } = useNpsMutations();
  const busy = addDetection.isPending || ignoreDetection.isPending;

  const add = async (relation: 'SELF' | 'CHILD') => {
    try {
      const result = await addDetection.mutateAsync({ key: detection.key, relation });
      void showToast(importingMessage(result.importing));
    } catch (e) {
      return void showToast(getErrorMessage(e, "Couldn't add the account. Try again."), { tone: 'danger' });
    }
    await refresh();
    refreshAfterImport();
  };
  const ignore = async () => {
    try {
      await ignoreDetection.mutateAsync(detection.key);
    } catch (e) {
      return void showToast(getErrorMessage(e, "Couldn't ignore this account. Try again."), { tone: 'danger' });
    }
    await refresh();
  };

  return (
    <Card.Row className="items-start first:border-t-0" data-testid="nps-gmail-new-account">
      <div className="flex-1 min-w-0 flex flex-col gap-space-8">
        <div>
          <Card.Title>Found in Gmail</Card.Title>
          <Card.Subtitle truncate={false}>{detectionDetails(detection)}</Card.Subtitle>
        </div>
        <div className="flex items-center gap-space-8">
          <Button variant="secondary" disabled={busy} loading={addDetection.isPending && addDetection.variables?.relation === 'SELF'} onClick={() => void add('SELF')}>
            Mine
          </Button>
          <Button variant="link" disabled={busy} loading={addDetection.isPending && addDetection.variables?.relation === 'CHILD'} onClick={() => void add('CHILD')}>
            My child&apos;s
          </Button>
        </div>
      </div>
      {addDetection.isPending ? null : (
        <Button variant="link" disabled={busy} loading={ignoreDetection.isPending} onClick={() => void ignore()}>
          Ignore
        </Button>
      )}
    </Card.Row>
  );
}

/** One card holding a block per account Gmail found; `children` (e.g. the empty state) follow as the card's last rows. */
export function NpsDetectedAccounts({ detections, children }: { detections: NpsDetection[]; children?: React.ReactNode }) {
  return (
    <Card>
      {detections.map((d) => (
        <DetectedAccount key={d.key} detection={d} />
      ))}
      {children}
    </Card>
  );
}
