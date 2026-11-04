'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { showToast } from '@/components/ds/Toast/Toast';
import { closeAccount, dismissAccountClosePrompt, reopenAccount } from '@/features/accounts/accountActions';
import { ClosePrompt } from '@/features/shell/ClosePrompt';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { keys } from '@/lib/query/keys';

/** "Close this account?" on an idle, empty account: Close (as of today, with Undo) or Not yet (asks no more). */
export function AccountClosePrompt({ accountId }: { accountId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const done = () => {
    void qc.invalidateQueries({ queryKey: keys.accounts.all });
    router.refresh();
  };
  const run = async (work: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await work();
      done();
    } catch (e) {
      showToast(getErrorMessage(e, fallback), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ClosePrompt
        title="Close this account?"
        body="No activity for 90 days and the balance is zero."
        confirmLabel="Close"
        busy={busy}
        onConfirm={() => setConfirming(true)}
        onDismiss={() =>
          void run(async () => {
            await unwrapAction(dismissAccountClosePrompt(accountId));
          }, "Couldn't save that. Try again.")
        }
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!busy) setConfirming(open);
        }}
        title="Close this account?"
        description="It will be closed as of today. You can reopen it later."
        confirmLabel="Close account"
        confirmLoading={busy}
        onConfirm={() =>
          void run(async () => {
            await unwrapAction(closeAccount(accountId, { closedOn: todayInAppZone() }));
            setConfirming(false);
            showToast('Account closed', {
              action: {
                label: 'Undo',
                onSelect: () => void unwrapAction(reopenAccount(accountId)).then(done, () => undefined),
              },
            });
          }, "Couldn't close the account. Try again.")
        }
      />
    </>
  );
}
