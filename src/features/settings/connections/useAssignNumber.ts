'use client';

import React, { useState } from 'react';

import type { NumberKind } from '@/features/accounts/cards/NumberKindChoice';
import { dayOf } from '@/features/accounts/cards/oldCard';
import { useOldCard } from '@/features/accounts/cards/useOldCard';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { UnknownNumberGroup } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';
import { notify } from '@/lib/notify';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';

import { assignCardToast, assignToast } from './attentionItemModel';
import { useGmailMutations } from './useGmailMutations';

/** The "Add to account" flow for one unknown number: pick an account (the suggestion is preselected, nothing else is guessed), save, toast. */
export function useAssignNumber(group: UnknownNumberGroup | null, onDone: () => void) {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { assignNumberMutation } = useGmailMutations();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chosenKind, setChosenKind] = useState<NumberKind | null>(null);
  const [oldCardErrors, setOldCardErrors] = useState<Record<string, string>>({});
  const today = todayInAppZone();

  // A different number (or none) starts clean.
  const key = group ? `${group.bank ?? ''}:${group.last4}` : null;
  const [shownKey, setShownKey] = useState(key);
  if (shownKey !== key) {
    setShownKey(key);
    setSelectedAccountId('');
    setErrorMessage(null);
    setChosenKind(null);
    setOldCardErrors({});
  }

  const accountId = selectedAccountId || group?.suggestion?.accountId || '';
  const account = accounts?.find((a) => a.id === accountId);
  // Bank accounts (debit cards) and credit cards can hold an old card.
  const canOldCard = account?.type === AccountType.BANK_ACCOUNT || account?.type === AccountType.CREDIT_CARD;
  const oldCard = useOldCard({
    accountId: canOldCard ? accountId : null,
    last4: group?.last4 ?? null,
    isBank: account?.type === AccountType.BANK_ACCOUNT,
    today,
    fallback: { firstSeen: dayOf(group?.firstMail), lastSeen: dayOf(group?.lastMail) },
  });
  const kind: NumberKind = canOldCard ? (chosenKind ?? (oldCard.suggested ? 'card' : 'number')) : 'number';

  const selectAccount = (id: string) => {
    setSelectedAccountId(id);
    setErrorMessage(null);
    setChosenKind(null);
    setOldCardErrors({});
  };

  const chooseKind = (next: NumberKind) => {
    setChosenKind(next);
    setOldCardErrors({});
  };

  const assignTo = async (targetId: string, asOldCard = false) => {
    if (!group) return;
    if (!targetId) {
      setErrorMessage('Select an account.');
      return;
    }
    setErrorMessage(null);
    let pastCard;
    if (asOldCard) {
      const built = oldCard.build();
      if (!built.ok) {
        setOldCardErrors(built.errors);
        return;
      }
      setOldCardErrors({});
      pastCard = built.body;
    }
    try {
      const res = await assignNumberMutation.mutateAsync({ bank: group.bank ?? undefined, last4: group.last4, accountId: targetId, pastCard });
      const name = accounts?.find((a) => a.id === targetId)?.name ?? 'the account';
      notify.success(asOldCard ? assignCardToast(group.last4, name, res) : assignToast(group.last4, name, res));
      onDone();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Couldn't add the number to the account. Try again."));
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    return assignTo(accountId, kind === 'card');
  };

  return {
    accounts: accounts ?? [],
    loadingAccounts,
    accountId,
    selectAccount,
    canOldCard,
    kind,
    chooseKind,
    oldCard,
    oldCardErrors,
    today,
    errorMessage,
    isPending: assignNumberMutation.isPending,
    submit,
    assignTo,
  };
}
