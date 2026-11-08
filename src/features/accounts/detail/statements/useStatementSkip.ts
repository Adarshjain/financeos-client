'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { notify } from '@/lib/notify';
import { keys } from '@/lib/query/keys';
import { useAppRouter } from '@/lib/useAppRouter';

import { skipStatementPeriod, undoStatementSkip } from './statementSkipActions';

/**
 * "No statement this period" on a card's cycle, and taking it back. Both refresh what shows the warning:
 * the Inbox and Upcoming queries, and the server-rendered account pages.
 */
export function useStatementSkip() {
  const qc = useQueryClient();
  const router = useAppRouter();
  const [refreshing, startRefresh] = React.useTransition();
  const [undoing, setUndoing] = React.useState<string | null>(null);
  const inFlight = React.useRef(false);

  const refresh = React.useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.obligations.all }),
      qc.invalidateQueries({ queryKey: keys.inbox.all }),
    ]);
    startRefresh(() => router.refresh());
  }, [qc, router]);

  const undo = React.useCallback(
    async (accountId: string, skipId: string) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setUndoing(skipId);
      try {
        await unwrapAction(undoStatementSkip(accountId, skipId));
        showToast('Statement expected again');
        await refresh();
      } catch (e) {
        showToast(getErrorMessage(e, "Couldn't undo this. Try again."), { tone: 'danger' });
      } finally {
        inFlight.current = false;
        setUndoing(null);
      }
    },
    [refresh],
  );

  const skip = React.useCallback(
    async (accountId: string, periodEnd: string) => {
      if (inFlight.current) return;
      inFlight.current = true;
      // The row's menu closes on press: a loading toast stands for the pending state until the result replaces it.
      const loadingId = `skip-period-${periodEnd}`;
      notify.loading('Marking this period…', { id: loadingId });
      let id: string;
      try {
        ({ id } = await unwrapAction(skipStatementPeriod(accountId, periodEnd)));
      } catch (e) {
        notify.dismiss(loadingId);
        showToast(getErrorMessage(e, "Couldn't mark this period. Try again."), { tone: 'danger' });
        inFlight.current = false;
        return;
      }
      notify.dismiss(loadingId);
      showToast('Marked: no statement this period', {
        action: { label: 'Undo', onSelect: () => void undo(accountId, id) },
      });
      try {
        await refresh();
      } finally {
        inFlight.current = false;
      }
    },
    [refresh, undo],
  );

  return { skip, undo, undoing, refreshing };
}
