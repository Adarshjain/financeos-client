'use client';

import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';

import { failedText, importingMessage, lockedText, unlockMessage } from './npsGmailModel';
import { useNpsMutations } from './useNpsMutations';

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

/** Statements Gmail found that need the user: waiting for a password, or failed to import. */
export function NpsGmailBanners({ locked, failed = 0 }: { locked: number; failed?: number }) {
  if (locked === 0 && failed === 0) return null;
  return (
    <div className="flex flex-col gap-space-8">
      {locked > 0 ? <LockedStatements count={locked} /> : null}
      {failed > 0 ? <FailedStatements count={failed} /> : null}
    </div>
  );
}
