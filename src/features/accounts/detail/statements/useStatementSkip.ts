'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';

import { skipStatementPeriod, undoStatementSkip } from './statementSkipActions';

/**
 * "No statement this period" on a card's cycle, and taking it back. Both refresh what shows the warning:
 * the Inbox and Upcoming queries, and the server-rendered account pages.
 */
export function useStatementSkip() {
  const qc = useQueryClient();
  const router = useRouter();

  const refresh = React.useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.obligations.all }),
      qc.invalidateQueries({ queryKey: keys.inbox.all }),
    ]);
    router.refresh();
  }, [qc, router]);

  const undo = React.useCallback(
    async (accountId: string, skipId: string) => {
      try {
        await unwrapAction(undoStatementSkip(accountId, skipId));
      } catch (e) {
        showToast(getErrorMessage(e, "Couldn't undo this. Try again."), { tone: 'danger' });
        return;
      }
      showToast('Statement expected again');
      await refresh();
    },
    [refresh],
  );

  const skip = React.useCallback(
    async (accountId: string, periodEnd: string) => {
      let id: string;
      try {
        ({ id } = await unwrapAction(skipStatementPeriod(accountId, periodEnd)));
      } catch (e) {
        showToast(getErrorMessage(e, "Couldn't mark this period. Try again."), { tone: 'danger' });
        return;
      }
      showToast('Marked: no statement this period', {
        action: { label: 'Undo', onSelect: () => void undo(accountId, id) },
      });
      await refresh();
    },
    [refresh, undo],
  );

  return { skip, undo };
}
