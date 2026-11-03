'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { showToast } from '@/components/ds/Toast/Toast';
import { loadCardholders } from '@/features/accounts/accountActions';
import { loadAccountForm, useAccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import type { Account } from '@/lib/account.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { answerIsThis, declineOlderNumber, hideSuggestion, saveBelongs, undoHideSuggestion } from './suggestionActions';
import { SuggestionBelongsDialog } from './SuggestionBelongsDialog';
import { loadSuggestionCardDialog, type SuggestionCardTarget } from './SuggestionCardDialog';
import { fittingAccounts, type SuggestionItem, type SuggestionRow } from './suggestionsModel';

/** What "Add" opens for a suggestion: the matching Add account type, or Edit on the account it belongs to. */
export function addTarget(row: Pick<SuggestionRow, 'kind' | 'parentAccountId'>, parentIds: ReadonlySet<string>):
  | { open: 'bank_account' | 'credit_card' }
  | { edit: string } {
  if (row.parentAccountId && parentIds.has(row.parentAccountId) && row.kind !== 'BANK_ACCOUNT' && row.kind !== 'CREDIT_CARD') {
    return { edit: row.parentAccountId };
  }
  return { open: row.kind === 'BANK_ACCOUNT' || row.kind === 'DEBIT_CARD' ? 'bank_account' : 'credit_card' };
}

/**
 * The actions behind a section's suggestion rows: Not mine (toast with Undo), the "Is this your …?" answers and Add.
 * Render `dialog` once in the section: it holds the card dialogs (and the Edit account fallback) that Add opens for a card on an account.
 */
export function useSuggestionActions(parents: readonly Account[], accounts: readonly Account[] = []) {
  const router = useRouter();
  const { open, preload } = useAccountDialogs();
  const { Component: AccountFormDialog, run } = useLazyDialog(loadAccountForm);
  const { Component: CardDialog, run: runCard } = useLazyDialog(loadSuggestionCardDialog);
  const [editing, setEditing] = React.useState<Account | null>(null);
  const [cardTarget, setCardTarget] = React.useState<SuggestionCardTarget | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [belongsRow, setBelongsRow] = React.useState<SuggestionRow | null>(null);

  const fail = (message: string) => showToast(message, { tone: 'danger' });

  const undo = async (id: string) => {
    const result = await undoHideSuggestion(id);
    if (!result.success) fail(result.error.message);
    router.refresh();
  };

  const notMine = async (row: SuggestionRow) => {
    setPendingId(row.id);
    try {
      const result = await hideSuggestion(row.id);
      if (!result.success) return fail(result.error.message);
      router.refresh();
      showToast(`Hidden ${row.name}${row.last4 ? ` ••${row.last4}` : ''}`, {
        action: { label: 'Undo', onSelect: () => void undo(row.id) },
        duration: 10_000,
      });
    } finally {
      setPendingId(null);
    }
  };

  const answer = async (row: SuggestionRow, yes: boolean) => {
    if (!row.isThis) return;
    setPendingId(row.id);
    try {
      const result = await answerIsThis(row.id, row.isThis.accountId, yes);
      if (!result.success) return fail(result.error.message);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  const savedToast = (row: Pick<SuggestionRow, 'last4'>, account: Account) =>
    showToast(`Saved ${row.last4 ? `••${row.last4} ` : ''}on ${account.name}`);

  /** "Older number on {account}?": Yes files it as a closed card there, No declines the link. */
  const answerOlder = async (row: SuggestionRow, yes: boolean) => {
    if (!row.olderOn) return;
    setPendingId(row.id);
    try {
      const result = yes
        ? await saveBelongs(row.id, { accountId: row.olderOn.accountId, as: 'OLDER_NUMBER' })
        : await declineOlderNumber(row.id);
      if (!result.success) return fail(result.error.message);
      router.refresh();
      if (yes) showToast(`Saved ${row.last4 ? `••${row.last4} ` : ''}on ${row.olderOn.accountName}`);
    } finally {
      setPendingId(null);
    }
  };

  const canBelong = (row: SuggestionRow) => fittingAccounts(row, accounts).length > 0;

  /** A card of an account we have opens that account's own card dialog; the Edit dialog is the way out when it can't. */
  const addCardTo = async (item: SuggestionItem, parent: Account) => {
    const edit = () => void run(() => setEditing(parent));
    const show = (next: SuggestionCardTarget) => void runCard(() => setCardTarget(next));
    if (item.kind === 'ADDON_CARD') return show({ kind: 'ADDON_CARD', item, parent });
    try {
      const result = await loadCardholders(parent.id);
      if (!result.success) return fail(result.error.message);
      const holder = result.data.find((h) => h.role === 'PRIMARY') ?? null;
      if (item.kind === 'DEBIT_CARD') return show({ kind: 'DEBIT_CARD', item, parent, holder });
      const card = holder?.cards.find((c) => !c.closedOn);
      if (holder && card) return show({ kind: 'REPLACEMENT_CARD', item, parent, holder, card });
      edit();
    } catch {
      fail("Couldn't load the cardholders. Try again.");
    }
  };

  const add = (row: SuggestionRow) => {
    const target = addTarget(row, new Set(parents.map((p) => p.id)));
    if ('open' in target) {
      // An add-on or replacement card without its account in the list has nothing to prefill: the plain Add dialog.
      const orphanCard = row.kind === 'ADDON_CARD' || row.kind === 'REPLACEMENT_CARD';
      return row.item && !orphanCard ? open(target.open, { fromSuggestion: row.item, onCreated: () => router.refresh() }) : open(target.open);
    }
    const account = parents.find((p) => p.id === target.edit);
    if (!account) return;
    if (!row.item) return void run(() => setEditing(account));
    setPendingId(row.id);
    void addCardTo(row.item, account).finally(() => setPendingId(null));
  };

  const dialog = (
    <>
      {editing && AccountFormDialog ? <AccountFormDialog account={editing} onClose={() => setEditing(null)} /> : null}
      {cardTarget && CardDialog ? <CardDialog target={cardTarget} onClose={() => setCardTarget(null)} /> : null}
      {belongsRow ? (
        <SuggestionBelongsDialog
          row={belongsRow}
          accounts={accounts}
          onClose={() => setBelongsRow(null)}
          onSaved={(account) => {
            router.refresh();
            savedToast(belongsRow, account);
          }}
        />
      ) : null}
    </>
  );

  return { pendingId, notMine, answer, answerOlder, canBelong, openBelongs: setBelongsRow, add, preload, dialog };
}

export type SuggestionActionsApi = ReturnType<typeof useSuggestionActions>;

const SuggestionActionsContext = React.createContext<SuggestionActionsApi | null>(null);

/** Gives the buttons in a section's table cells the section's current actions, so the columns stay fixed. */
export const SuggestionActionsProvider = SuggestionActionsContext.Provider;

/** The buttons at the end of a suggestion row (a table cell on desktop, the last line on phone). */
export function SuggestionButtons({ row }: { row: SuggestionRow }) {
  const actions = React.useContext(SuggestionActionsContext);
  if (!actions) return null;
  const busy = actions.pendingId === row.id;
  if (row.olderOn) {
    return (
      <div className="flex items-center justify-end gap-space-4">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void actions.answerOlder(row, false)}>
          No
        </Button>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void actions.answerOlder(row, true)}>
          Yes
        </Button>
      </div>
    );
  }
  if (row.isThis) {
    return (
      <div className="flex items-center justify-end gap-space-4">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void actions.answer(row, false)}>
          No
        </Button>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void actions.answer(row, true)}>
          Yes
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-space-4">
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => void actions.notMine(row)}>
        Not mine
      </Button>
      {actions.canBelong(row) ? (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => actions.openBelongs(row)}>
          Part of another account
        </Button>
      ) : null}
      <Button variant="secondary" size="sm" disabled={busy} onPointerDown={actions.preload} onClick={() => actions.add(row)}>
        Add
      </Button>
    </div>
  );
}
