'use client';

import React, { useState } from 'react';

import { getErrorMessage } from '@/lib/api/errorMessage';
import { notify } from '@/lib/notify';
import { useAccounts } from '@/lib/query/hooks/useAccounts';

import { useGmailMutations } from './useGmailMutations';

/** The "Assign & remember" flow for one Gmail attention item: pick an account, save, toast. */
export function useAssignAccount(
  item: { id: string } | null,
  onDone: () => void,
) {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { assignAttentionMutation } = useGmailMutations();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // A different item (or none) starts clean: no stale pick or error from the last one.
  const itemId = item?.id ?? null;
  const [shownItemId, setShownItemId] = useState(itemId);
  if (shownItemId !== itemId) {
    setShownItemId(itemId);
    setSelectedAccountId('');
    setErrorMessage(null);
  }

  const effectiveAccountId = selectedAccountId || accounts?.[0]?.id || '';

  const selectAccount = (id: string) => {
    setSelectedAccountId(id);
    setErrorMessage(null);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!item) return;
    if (!effectiveAccountId) {
      setErrorMessage('Please select an account.');
      return;
    }

    setErrorMessage(null);
    try {
      const res = await assignAttentionMutation.mutateAsync({
        ledgerId: item.id,
        body: { accountId: effectiveAccountId },
      });

      if (res?.reactivatedCount && res.reactivatedCount > 0) {
        notify.success(`Re-processing ${res.reactivatedCount} parked emails`);
      } else {
        notify.success('Account identifier assigned');
      }

      onDone();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Failed to assign identifier to account'));
    }
  };

  return {
    accounts: accounts ?? [],
    loadingAccounts,
    effectiveAccountId,
    selectAccount,
    errorMessage,
    isPending: assignAttentionMutation.isPending,
    submit,
  };
}
