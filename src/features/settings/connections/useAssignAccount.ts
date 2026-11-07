'use client';

import React, { useState } from 'react';

import type { NumberKind } from '@/features/accounts/cards/NumberKindChoice';
import { dayOf } from '@/features/accounts/cards/oldCard';
import { useOldCard } from '@/features/accounts/cards/useOldCard';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { notify } from '@/lib/notify';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';

import { useGmailMutations } from './useGmailMutations';

/** The "Assign & remember" flow for one Gmail attention item: pick an account, save, toast. */
export function useAssignAccount(
  item: { id: string; extractedLast4?: string | null; internalDate?: string | null; discoveredAt?: string } | null,
  onDone: () => void,
) {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { assignAttentionMutation } = useGmailMutations();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chosenKind, setChosenKind] = useState<NumberKind | null>(null);
  const [oldCardErrors, setOldCardErrors] = useState<Record<string, string>>({});
  const today = todayInAppZone();

  // A different item (or none) starts clean: no stale pick or error from the last one.
  const itemId = item?.id ?? null;
  const [shownItemId, setShownItemId] = useState(itemId);
  if (shownItemId !== itemId) {
    setShownItemId(itemId);
    setSelectedAccountId('');
    setErrorMessage(null);
    setChosenKind(null);
    setOldCardErrors({});
  }

  const effectiveAccountId = selectedAccountId || accounts?.[0]?.id || '';
  const account = accounts?.find((a) => a.id === effectiveAccountId);
  const last4 = item?.extractedLast4 && /^\d{4}$/.test(item.extractedLast4) ? item.extractedLast4 : null;
  // A mail that names a 4-digit number can hold an old card on a bank account (debit cards) or a credit card.
  const canOldCard = last4 !== null && (account?.type === AccountType.BANK_ACCOUNT || account?.type === AccountType.CREDIT_CARD);
  const oldCard = useOldCard({
    accountId: canOldCard ? effectiveAccountId : null,
    last4,
    isBank: account?.type === AccountType.BANK_ACCOUNT,
    today,
    fallback: { lastSeen: dayOf(item?.internalDate ?? item?.discoveredAt) },
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

  const assignTo = async (accountId: string, asOldCard = false) => {
    if (!item) return;
    if (!accountId) {
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
      const res = await assignAttentionMutation.mutateAsync({
        ledgerId: item.id,
        body: { accountId, pastCard },
      });

      if (asOldCard) {
        notify.success(`Saved ••${last4} as an old card${res?.reactivatedCount ? ` · re-processing ${res.reactivatedCount} parked emails` : ''}`);
      } else if (res?.reactivatedCount && res.reactivatedCount > 0) {
        notify.success(`Re-processing ${res.reactivatedCount} parked emails`);
      } else {
        notify.success('Account identifier assigned');
      }

      onDone();
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Couldn't assign the identifier. Try again."));
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    return assignTo(effectiveAccountId, kind === 'card');
  };

  return {
    accounts: accounts ?? [],
    loadingAccounts,
    effectiveAccountId,
    selectAccount,
    canOldCard,
    kind,
    chooseKind,
    oldCard,
    oldCardErrors,
    today,
    errorMessage,
    isPending: assignAttentionMutation.isPending,
    submit,
    assignTo,
  };
}
