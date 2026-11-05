'use client';

import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';

import { detectionText, failedText, importingMessage, lockedText, unlockMessage } from './npsGmailModel';
import type { NpsSummary } from './npsModel';
import { useNpsMutations } from './useNpsMutations';

type Detection = NpsSummary['pendingGmail'][number];

/** Statements Gmail found but couldn't open: one banner, one password for all of them. */
function LockedStatements({ count }: { count: number }) {
  const { unlockLocked, refresh } = useNpsMutations();
  const [password, setPassword] = React.useState('');

  const unlock = async () => {
    try {
      const result = await unlockLocked.mutateAsync(password);
      const message = unlockMessage(result);
      void showToast(message.text, { tone: message.tone });
      setPassword('');
    } catch (e) {
      return void showToast(getErrorMessage(e, "Couldn't unlock the statements. Try again."), { tone: 'danger' });
    }
    await refresh();
  };

  return (
    <div className="flex flex-col gap-space-8" data-testid="nps-gmail-password">
      <Banner tone="warning" rounded="md">
        {lockedText(count)}
      </Banner>
      <div className="flex items-end gap-space-8">
        <div className="flex-1 min-w-0">
          <TextField
            type="password"
            label="Statement password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={unlockLocked.isPending}
            autoComplete="off"
          />
        </div>
        <Button variant="secondary" loading={unlockLocked.isPending} disabled={unlockLocked.isPending || !password} onClick={() => void unlock()}>
          Unlock
        </Button>
      </div>
    </div>
  );
}

/** Statements Gmail found but couldn't import after three tries: one banner, one Retry. */
function FailedStatements({ count }: { count: number }) {
  const { retryFailed, refresh, refreshAfterImport } = useNpsMutations();

  const retry = async () => {
    try {
      const result = await retryFailed.mutateAsync();
      void showToast(importingMessage(result.importing));
    } catch (e) {
      return void showToast(getErrorMessage(e, "Couldn't retry the imports. Try again."), { tone: 'danger' });
    }
    await refresh();
    refreshAfterImport();
  };

  return (
    <div data-testid="nps-gmail-failed">
      <Banner tone="warning" rounded="md" action={retryFailed.isPending ? undefined : { label: 'Retry', onSelect: () => void retry() }}>
        {failedText(count)}
      </Banner>
    </div>
  );
}

/** An account found in Gmail: nothing is imported until the user says whose it is (or ignores it). */
function DetectedAccount({ detection }: { detection: Detection }) {
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
    <div className="flex flex-col gap-space-8" data-testid="nps-gmail-new-account">
      <Banner tone="warning" rounded="md" action={busy ? undefined : { label: 'Ignore', onSelect: () => void ignore() }}>
        {detectionText(detection)}
      </Banner>
      <div className="flex items-center gap-space-8">
        <Button variant="secondary" disabled={busy} onClick={() => void add('SELF')}>
          Mine
        </Button>
        <Button variant="link" disabled={busy} onClick={() => void add('CHILD')}>
          My child&apos;s
        </Button>
      </div>
    </div>
  );
}

/** What Gmail found that needs the user: accounts waiting for "whose is it?", statements waiting for a password. */
export function NpsGmailBanners({ detections, locked, failed = 0 }: { detections: NpsSummary['pendingGmail']; locked: number; failed?: number }) {
  if (detections.length === 0 && locked === 0 && failed === 0) return null;
  return (
    <div className="flex flex-col gap-space-8">
      {locked > 0 ? <LockedStatements count={locked} /> : null}
      {failed > 0 ? <FailedStatements count={failed} /> : null}
      {detections.map((d) => (
        <DetectedAccount key={d.key} detection={d} />
      ))}
    </div>
  );
}
