'use client';

import { Account } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { AccountType } from '@/lib/types';

import { ViewState } from './types';
import { useCardsDialogHandlers } from './useCardsDialogHandlers';
import { useCardsDialogMutations } from './useCardsDialogMutations';
import { useCardsDialogState } from './useCardsDialogState';

export type { ViewState };

/**
 * Composes the pure form/view state (`useCardsDialogState`), the reads and
 * mutations (`useCardsDialogMutations`), and their handlers
 * (`useCardsDialogHandlers`) into the same flat API `CardsDialog` and its
 * sub-forms already consume — splitting the state machine, the server
 * wiring, and the handlers into separate files keeps each well under the
 * line-count limit without changing that public shape.
 */
export function useCardsDialog(account: Account) {
  const isBank = account.type === AccountType.BANK_ACCOUNT;
  const state = useCardsDialogState();
  const mutations = useCardsDialogMutations(account.id, state.open);
  const handlers = useCardsDialogHandlers({ accountId: account.id, isBank, state, mutations });

  const { cardholdersQuery, reopenCardholderMutation, deleteCardholderMutation, deleteCardPlasticMutation } = mutations;
  const {
    addPrimaryMutation,
    addAddonMutation,
    updateCardholderMutation,
    closeCardholderMutation,
    addCardMutation,
    replaceCardMutation,
    closeCardMutation,
    reattributeMutation,
  } = mutations;

  const handleOpenChange = (nextOpen: boolean) => {
    state.setOpen(nextOpen);
    if (nextOpen) {
      state.backToList();
    }
  };

  const isSubmitting =
    addPrimaryMutation.isPending ||
    addAddonMutation.isPending ||
    updateCardholderMutation.isPending ||
    closeCardholderMutation.isPending ||
    addCardMutation.isPending ||
    replaceCardMutation.isPending ||
    closeCardMutation.isPending;

  const isLoading =
    cardholdersQuery.isLoading ||
    reopenCardholderMutation.isPending ||
    deleteCardholderMutation.isPending ||
    deleteCardPlasticMutation.isPending;

  return {
    open: state.open,
    handleOpenChange,
    cardholders: cardholdersQuery.data ?? [],
    isLoading,
    error: cardholdersQuery.error ? getErrorMessage(cardholdersQuery.error, 'Failed to fetch cardholders') : null,
    view: state.view,
    targetCardholder: state.targetCardholder,
    targetCard: state.targetCard,
    personName: state.personName,
    setPersonName: state.setPersonName,
    relationship: state.relationship,
    setRelationship: state.setRelationship,
    spendLimit: state.spendLimit,
    setSpendLimit: state.setSpendLimit,
    cardLast4: state.cardLast4,
    setCardLast4: state.setCardLast4,
    openedOn: state.openedOn,
    setOpenedOn: state.setOpenedOn,
    issuedOn: state.issuedOn,
    setIssuedOn: state.setIssuedOn,
    closeDate: state.closeDate,
    setCloseDate: state.setCloseDate,
    replaceNewLast4: state.replaceNewLast4,
    setReplaceNewLast4: state.setReplaceNewLast4,
    replaceIssuedOn: state.replaceIssuedOn,
    setReplaceIssuedOn: state.setReplaceIssuedOn,
    formError: state.formError,
    isSubmitting,
    reattributeFrom: state.reattributeFrom,
    setReattributeFrom: state.setReattributeFrom,
    reattributeTo: state.reattributeTo,
    setReattributeTo: state.setReattributeTo,
    reattributeSource: state.reattributeSource,
    setReattributeSource: state.setReattributeSource,
    isReattributing: reattributeMutation.isPending,
    reattributeError: state.reattributeError,
    backToList: state.backToList,
    isBank,
    startAddPrimary: state.startAddPrimary,
    startAddAddon: state.startAddAddon,
    startEditCardholder: state.startEditCardholder,
    startCloseCardholder: state.startCloseCardholder,
    startIssueCard: state.startIssueCard,
    startReplaceCard: state.startReplaceCard,
    startCloseCard: state.startCloseCard,
    startReassign: state.startReassign,
    ...handlers,
  };
}
