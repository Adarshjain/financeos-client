'use client';

import { toast } from 'sonner';

import {
  Card,
  Cardholder,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { toastError } from '@/lib/toastError';

import { useCardsDialogMutations } from './useCardsDialogMutations';
import { useCardsDialogState } from './useCardsDialogState';

type DialogState = ReturnType<typeof useCardsDialogState>;
type DialogMutations = ReturnType<typeof useCardsDialogMutations>;

interface UseCardsDialogHandlersArgs {
  accountId: string;
  isBank: boolean;
  state: DialogState;
  mutations: DialogMutations;
}

/**
 * Every submit/action handler for the cards dialog's sub-views: validates the
 * relevant form-state fields, calls the matching mutation, and routes success
 * (toast + back to the list) or failure (inline `formError`/`reattributeError`,
 * or a toast for the list's own quick actions) exactly as the pre-migration
 * handlers did. Pulled out of `useCardsDialog` purely to keep files under the
 * line-count limit — no behaviour change.
 */
export function useCardsDialogHandlers({ accountId, isBank, state, mutations }: UseCardsDialogHandlersArgs) {
  const {
    targetCardholder,
    targetCard,
    personName,
    relationship,
    spendLimit,
    cardLast4,
    openedOn,
    issuedOn,
    closeDate,
    replaceNewLast4,
    replaceIssuedOn,
    setFormError,
    reattributeFrom,
    reattributeTo,
    reattributeSource,
    setReattributeError,
    backToList,
  } = state;

  const {
    addPrimaryMutation,
    addAddonMutation,
    updateCardholderMutation,
    closeCardholderMutation,
    reopenCardholderMutation,
    deleteCardholderMutation,
    addCardMutation,
    replaceCardMutation,
    closeCardMutation,
    deleteCardPlasticMutation,
    reattributeMutation,
  } = mutations;

  const handleSavePrimary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardLast4 || cardLast4.length !== 4) {
      setFormError('Card last 4 digits must be exactly 4 digits.');
      return;
    }
    setFormError(null);
    const payload: CreateCardRequest = { last4: cardLast4.trim(), issuedOn: issuedOn || undefined };
    try {
      await addPrimaryMutation.mutateAsync(payload);
      toast.success('Debit card added');
      backToList();
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't add the debit card. Try again."));
    }
  };

  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setFormError('Cardholder name is required.');
      return;
    }
    if (cardLast4 && cardLast4.length !== 4) {
      setFormError('Card last 4 digits must be exactly 4 digits.');
      return;
    }
    setFormError(null);
    const payload: CreateCardholderRequest = {
      personName: personName.trim(),
      relationship,
      spendLimit: spendLimit ? parseFloat(spendLimit) : null,
      last4: cardLast4.trim() || undefined,
      openedOn: openedOn || undefined,
      issuedOn: cardLast4 ? issuedOn || openedOn || undefined : undefined,
    };
    try {
      await addAddonMutation.mutateAsync(payload);
      toast.success(isBank ? 'Joint holder added' : 'Add-on cardholder created');
      backToList();
    } catch (err) {
      setFormError(getErrorMessage(err, isBank ? "Couldn't add the joint holder. Try again." : "Couldn't add the add-on cardholder. Try again."));
    }
  };

  const handleSaveEditCardholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardholder) return;
    setFormError(null);
    const payload: UpdateCardholderRequest = {
      personName: personName.trim() || undefined,
      relationship: targetCardholder.role === 'PRIMARY' ? 'SELF' : relationship,
      spendLimit: spendLimit ? parseFloat(spendLimit) : null,
    };
    try {
      await updateCardholderMutation.mutateAsync({ cardholderId: targetCardholder.id, body: payload });
      toast.success('Cardholder updated');
      backToList();
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't update the cardholder. Try again."));
    }
  };

  const handleConfirmCloseCardholder = async () => {
    if (!targetCardholder) return;
    try {
      await closeCardholderMutation.mutateAsync({
        cardholderId: targetCardholder.id,
        body: { closedOn: closeDate || undefined },
      });
      toast.success('Cardholder closed');
      backToList();
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't close the cardholder. Try again."));
    }
  };

  const handleReopenCardholder = async (ch: Cardholder) => {
    try {
      await reopenCardholderMutation.mutateAsync(ch.id);
      toast.success('Cardholder reopened');
    } catch (err) {
      toastError(err, "Couldn't reopen the cardholder. Try again.");
    }
  };

  const handleDeleteCardholder = async (ch: Cardholder) => {
    if (!confirm(`Delete cardholder ${ch.personName || ch.role}? This can't be undone.`)) {
      return;
    }
    try {
      await deleteCardholderMutation.mutateAsync(ch.id);
      toast.success('Cardholder deleted');
    } catch (err) {
      toastError(err, "Couldn't delete the cardholder. Try again.");
    }
  };

  const handleSaveIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardholder) return;
    if (!cardLast4 || cardLast4.length !== 4) {
      setFormError('Last 4 digits must be exactly 4 digits.');
      return;
    }
    setFormError(null);
    const payload: CreateCardRequest = { last4: cardLast4.trim(), issuedOn: issuedOn || undefined };
    try {
      await addCardMutation.mutateAsync({ cardholderId: targetCardholder.id, body: payload });
      toast.success('Card issued');
      backToList();
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't issue the card. Try again."));
    }
  };

  const handleSaveReplaceCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardholder || !targetCard) return;
    if (!replaceNewLast4 || replaceNewLast4.length !== 4) {
      setFormError('New last 4 digits must be exactly 4 digits.');
      return;
    }
    setFormError(null);
    const payload: ReplaceCardRequest = { newLast4: replaceNewLast4.trim(), issuedOn: replaceIssuedOn || undefined };
    try {
      await replaceCardMutation.mutateAsync({ cardholderId: targetCardholder.id, cardId: targetCard.id, body: payload });
      toast.success('Card replaced');
      backToList();
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't replace the card. Try again."));
    }
  };

  const handleConfirmCloseCard = async () => {
    if (!targetCardholder || !targetCard) return;
    try {
      await closeCardMutation.mutateAsync({
        cardholderId: targetCardholder.id,
        cardId: targetCard.id,
        body: { closedOn: closeDate || undefined },
      });
      toast.success('Card plastic closed');
      backToList();
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't close the card. Try again."));
    }
  };

  const handleDeleteCardPlastic = async (ch: Cardholder, card: Card) => {
    if (!confirm(`Are you sure you want to delete card •••• ${card.last4}?`)) {
      return;
    }
    try {
      await deleteCardPlasticMutation.mutateAsync({ cardholderId: ch.id, cardId: card.id });
      toast.success('Card plastic deleted');
    } catch (err) {
      toastError(err, "Couldn't delete the card. Try again.");
    }
  };

  const handleConfirmReattribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardholder) return;

    const openPlastic = (targetCardholder.cards || []).find((c) => !c.closedOn);
    const targetCardId = targetCard?.id || openPlastic?.id;
    if (!targetCardId) {
      setReattributeError('Target cardholder has no valid card to reassign transactions to.');
      return;
    }
    setReattributeError(null);

    try {
      const res = await reattributeMutation.mutateAsync({
        accountId,
        from: reattributeFrom || undefined,
        to: reattributeTo || undefined,
        currentCardId: reattributeSource === 'UNATTRIBUTED' ? null : reattributeSource,
        cardId: targetCardId,
      });
      toast.success(`${res.updatedCount} transaction(s) reassigned`);
      backToList();
    } catch (err) {
      setReattributeError(getErrorMessage(err, "Couldn't reassign transactions. Try again."));
    }
  };

  return {
    handleSavePrimary,
    handleSaveAddon,
    handleSaveEditCardholder,
    handleConfirmCloseCardholder,
    handleReopenCardholder,
    handleDeleteCardholder,
    handleSaveIssueCard,
    handleSaveReplaceCard,
    handleConfirmCloseCard,
    handleDeleteCardPlastic,
    handleConfirmReattribute,
  };
}
