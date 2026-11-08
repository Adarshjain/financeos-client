'use client';

import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { LENDINGS_HREF } from '@/features/lendings/lendingsHref';
import { useCounterpartyMutations } from '@/features/lendings/useCounterpartyMutations';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { UpdateLendingRequest } from '@/lib/lending.types';
import { useAppRouter } from '@/lib/useAppRouter';

export interface EntryChange {
  body: UpdateLendingRequest;
  /** The bank transaction linked before the edit, and the one linked after it (null = none). */
  originalTransactionId: string | null;
  transactionId: string | null;
}

/**
 * Everything the person page does to the person and their entries: each action runs the mutation, says what
 * happened in a Toast and refreshes the page. Failures surface the server's message. Each returns whether it worked.
 */
export function usePersonMutations(counterpartyId: string) {
  const router = useAppRouter();
  const m = useCounterpartyMutations(counterpartyId, {
    onError: (e, fallback) => showToast(getErrorMessage(e, fallback), { tone: 'danger' }),
  });

  // Refreshes run in a transition so a control stays pending until the page shows the new data.
  const [navPending, startNav] = React.useTransition();
  const refresh = () => startNav(() => router.refresh());

  const updatePerson = async (name: string, notes: string): Promise<boolean> => {
    try {
      await m.updateCp.mutateAsync({ name: name.trim(), notes: notes.trim() || undefined });
      showToast('Person updated');
      refresh();
      return true;
    } catch {
      return false;
    }
  };

  const deletePerson = async (): Promise<boolean> => {
    try {
      await m.deleteCp.mutateAsync();
      showToast('Person deleted');
      startNav(() => router.replace(LENDINGS_HREF));
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Saves the entry and moves its bank transaction when that changed (separate endpoints). The old transaction is
   * unlinked first, because the server refuses to change the direction of a linked entry; the new pick is linked last.
   */
  const updateEntry = async (id: string, change: EntryChange): Promise<boolean> => {
    try {
      const moved = change.transactionId !== change.originalTransactionId;
      if (moved && change.originalTransactionId) await m.unlinkTransaction.mutateAsync(id);
      await m.updateLending.mutateAsync({ id, body: change.body });
      if (moved && change.transactionId) await m.linkTransaction.mutateAsync({ id, transactionId: change.transactionId });
      showToast('Entry updated');
      refresh();
      return true;
    } catch {
      return false;
    }
  };

  const deleteEntry = async (id: string): Promise<boolean> => {
    try {
      await m.deleteLending.mutateAsync(id);
      showToast('Entry deleted');
      refresh();
      return true;
    } catch {
      return false;
    }
  };

  return {
    updatePerson,
    deletePerson,
    updateEntry,
    deleteEntry,
    pending: {
      person: m.updateCp.isPending || navPending,
      deletePerson: m.deleteCp.isPending || navPending,
      entry: m.updateLending.isPending || m.linkTransaction.isPending || m.unlinkTransaction.isPending || navPending,
      deleteEntry: m.deleteLending.isPending || navPending,
    },
  };
}
