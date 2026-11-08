'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { GRID_GAP } from '@/components/ds/gridGap';
import { showToast } from '@/components/ds/Toast/Toast';
import { useAccountFormMutations } from '@/features/accounts/form/useAccountFormMutations';
import { appHref } from '@/features/shell/routes';
import type { Account } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';

import { CloseAccountSection, DeleteAccountSection } from './AccountLifecycleSections';

const ACCOUNTS_HREF = appHref('/accounts');

/** Close (or reopen) and Delete: two cards that end the Overview. */
export function AccountLifecycleCard({ account }: { account: Account }) {
  const router = useRouter();
  const qc = useQueryClient();
  const mutations = useAccountFormMutations();
  const today = todayInAppZone();
  const [closeDate, setCloseDate] = React.useState('');
  const [showDelete, setShowDelete] = React.useState(false);
  // After a delete, the confirm keeps loading until the Accounts page has replaced this one.
  const [leaving, startLeaving] = React.useTransition();
  const deleting = mutations.deleteAccountMutation.isPending || leaving;

  const noun = account.type === AccountType.CREDIT_CARD ? 'card' : 'account';
  const busy =
    mutations.closeAccountMutation.isPending ||
    mutations.reopenAccountMutation.isPending ||
    deleting;

  const refreshed = () => {
    void qc.invalidateQueries({ queryKey: keys.accounts.all });
    router.refresh();
  };

  const closeAccount = async () => {
    try {
      const closed = await mutations.closeAccountMutation.mutateAsync({
        id: account.id,
        body: { closedOn: closeDate || undefined },
      });
      if (closed.warnings && closed.warnings.length > 0) {
        showToast(closed.warnings.join('; '), { tone: 'warning' });
      } else {
        showToast('Account closed');
      }
      refreshed();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't close the account. Try again."), { tone: 'danger' });
    }
  };

  const reopenAccount = async () => {
    try {
      await mutations.reopenAccountMutation.mutateAsync(account.id);
      showToast('Account reopened');
      refreshed();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't reopen the account. Try again."), { tone: 'danger' });
    }
  };

  const deleteAccount = async () => {
    try {
      await mutations.deleteAccountMutation.mutateAsync(account.id);
      showToast('Account deleted');
      // Replace, so Back doesn't return to the deleted account's page.
      startLeaving(() => {
        router.replace(ACCOUNTS_HREF);
        router.refresh();
      });
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't delete the account. Try again."), { tone: 'danger' });
    }
  };

  return (
    <>
      <div className={`grid grid-cols-1 desk:grid-cols-2 items-start ${GRID_GAP}`}>
        <Card title="Close account">
          <div className="px-space-16 pt-space-4 pb-space-14">
            <CloseAccountSection
              closedOn={account.closedOn}
              today={today}
              closeDate={closeDate}
              onCloseDateChange={setCloseDate}
              closing={mutations.closeAccountMutation.isPending}
              reopening={mutations.reopenAccountMutation.isPending}
              disabled={busy}
              onClose={closeAccount}
              onReopen={reopenAccount}
              noun={noun}
            />
          </div>
        </Card>
        <Card title="Delete account">
          <div className="px-space-16 pt-space-4 pb-space-14">
            <DeleteAccountSection disabled={busy} onDelete={() => setShowDelete(true)} />
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={(open) => {
          if (!deleting) setShowDelete(open);
        }}
        title={`Delete ${account.name}?`}
        description="Deletes the account with all its transactions, statements, cards, reward rules and Gmail history. This can't be undone."
        confirmLabel="Delete"
        confirmLoading={deleting}
        onConfirm={deleteAccount}
      >
        {account.closedOn ? null : (
          <Banner tone="warning" title="Not using this account any more?">
            Close it instead. Closing keeps all its history. Use Close account on this page.
          </Banner>
        )}
      </ConfirmDialog>
    </>
  );
}
