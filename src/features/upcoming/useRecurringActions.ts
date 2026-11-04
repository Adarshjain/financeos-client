'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { unwrapAction } from '@/lib/actionResult';
import {
  convertRecurring,
  dismissRecurring,
  stopRecurring,
  trackRecurring,
} from '@/lib/query/actions/recurringActions';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

/** Track / Not regular / Stop tracking / converted: each calls its endpoint, toasts, then refreshes proposals and the Upcoming rows. */
export function useRecurringActions() {
  const qc = useQueryClient();
  const refresh = React.useCallback(
    () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.recurring.all }),
        qc.invalidateQueries({ queryKey: keys.obligations.all }),
      ]),
    [qc],
  );
  const run = React.useCallback(
    async (call: () => Promise<unknown>, message: string | null, fallback: string) => {
      try {
        await call();
      } catch (e) {
        toastError(e, fallback);
        return false;
      }
      if (message) showToast(message);
      await refresh();
      return true;
    },
    [refresh],
  );
  return React.useMemo(
    () => ({
      track: (id: string, name: string) =>
        run(() => unwrapAction(trackRecurring(id)), `Tracking ${name}`, "Couldn't track this payment. Try again."),
      dismiss: (id: string, name: string) =>
        run(
          () => unwrapAction(dismissRecurring(id)),
          `Got it, we won't suggest ${name} again`,
          "Couldn't dismiss this suggestion. Try again.",
        ),
      stop: (id: string, name: string) =>
        run(() => unwrapAction(stopRecurring(id)), `Stopped tracking ${name}`, "Couldn't stop tracking. Try again."),
      converted: (id: string, loanId: string) =>
        run(() => unwrapAction(convertRecurring(id, loanId)), null, "Couldn't link the loan to this payment. Try again."),
    }),
    [run],
  );
}
