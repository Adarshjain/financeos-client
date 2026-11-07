'use client';

import React, { useState } from 'react';

import { getErrorMessage } from '@/lib/api/errorMessage';
import type { UnknownNumberGroup } from '@/lib/api/types';
import { notify } from '@/lib/notify';
import { useAccounts } from '@/lib/query/hooks/useAccounts';

import { assignToast } from './attentionItemModel';
import { useGmailMutations } from './useGmailMutations';

/** The "Add to account" flow for one unknown number: pick an account (the suggestion is preselected, nothing else is guessed), save, toast. */
export function useAssignNumber(group: UnknownNumberGroup | null, onDone: () => void) {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { assignNumberMutation } = useGmailMutations();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // A different number (or none) starts clean.
  const key = group ? `${group.bank ?? ''}:${group.last4}` : null;
  const [shownKey, setShownKey] = useState(key);
  if (shownKey !== key) {
    setShownKey(key);
    setSelectedAccountId('');
    setErrorMessage(null);
  }

  const accountId = selectedAccountId || group?.suggestion?.accountId || '';

  const selectAccount = (id: string) => {
    setSelectedAccountId(id);
    setErrorMessage(null);
  };

  const assignTo = async (targetId: string) => {
    if (!group) return;
    if (!targetId) {
      setErrorMessage('Select an account.');
      return;
    }
    setErrorMessage(null);
    try {
      const res = await assignNumberMutation.mutateAsync({ bank: group.bank ?? undefined, last4: group.last4, accountId: targetId });
      const name = accounts?.find((a) => a.id === targetId)?.name ?? 'the account';
      notify.success(assignToast(group.last4, name, res));
      onDone();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Couldn't add the number to the account. Try again."));
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    return assignTo(accountId);
  };

  return {
    accounts: accounts ?? [],
    loadingAccounts,
    accountId,
    selectAccount,
    errorMessage,
    isPending: assignNumberMutation.isPending,
    submit,
    assignTo,
  };
}
