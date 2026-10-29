'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  CloseCardholderRequest,
  CloseCardRequest,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';
import { BulkReattributeCardRequest } from '@/lib/transaction.types';

import {
  addAddonCardholder,
  addCard,
  addPrimaryCard,
  closeCard,
  closeCardholder,
  closeCardPlastic,
  deleteCardholder,
  loadCardholders,
  reattributeTransactionsToCard,
  reopenCardholder,
  replaceCard,
  updateCardholder,
} from '../actions';

/**
 * Reads and mutations for the cards dialog. Everything here is keyed on
 * `accountId` and invalidates `keys.accounts.all` on success — that prefix
 * covers the cardholders list, the account list (cardholder counts / card
 * badges), and the account detail, so every surface showing this account's
 * cards picks up the change without any manual full-page refresh.
 */
export function useCardsDialogMutations(accountId: string, open: boolean) {
  const qc = useQueryClient();
  const invalidateAccounts = () => qc.invalidateQueries({ queryKey: keys.accounts.all });

  const cardholdersQuery = useQuery({
    queryKey: keys.accounts.cardholders(accountId),
    queryFn: () => unwrapAction(loadCardholders(accountId)),
    enabled: open,
  });

  const addPrimaryMutation = useMutation({
    mutationFn: (body: CreateCardRequest) => unwrapAction(addPrimaryCard(accountId, body)),
    onSuccess: invalidateAccounts,
  });

  const addAddonMutation = useMutation({
    mutationFn: (body: CreateCardholderRequest) => unwrapAction(addAddonCardholder(accountId, body)),
    onSuccess: invalidateAccounts,
  });

  const updateCardholderMutation = useMutation({
    mutationFn: ({ cardholderId, body }: { cardholderId: string; body: UpdateCardholderRequest }) =>
      unwrapAction(updateCardholder(accountId, cardholderId, body)),
    onSuccess: invalidateAccounts,
  });

  const closeCardholderMutation = useMutation({
    mutationFn: ({ cardholderId, body }: { cardholderId: string; body?: CloseCardholderRequest }) =>
      unwrapAction(closeCardholder(accountId, cardholderId, body)),
    onSuccess: invalidateAccounts,
  });

  const reopenCardholderMutation = useMutation({
    mutationFn: (cardholderId: string) => unwrapAction(reopenCardholder(accountId, cardholderId)),
    onSuccess: invalidateAccounts,
  });

  const deleteCardholderMutation = useMutation({
    mutationFn: (cardholderId: string) => unwrapAction(deleteCardholder(accountId, cardholderId)),
    onSuccess: invalidateAccounts,
  });

  const addCardMutation = useMutation({
    mutationFn: ({ cardholderId, body }: { cardholderId: string; body: CreateCardRequest }) =>
      unwrapAction(addCard(accountId, cardholderId, body)),
    onSuccess: invalidateAccounts,
  });

  const replaceCardMutation = useMutation({
    mutationFn: ({ cardholderId, cardId, body }: { cardholderId: string; cardId: string; body: ReplaceCardRequest }) =>
      unwrapAction(replaceCard(accountId, cardholderId, cardId, body)),
    onSuccess: invalidateAccounts,
  });

  const closeCardMutation = useMutation({
    mutationFn: ({ cardholderId, cardId, body }: { cardholderId: string; cardId: string; body?: CloseCardRequest }) =>
      unwrapAction(closeCard(accountId, cardholderId, cardId, body)),
    onSuccess: invalidateAccounts,
  });

  /**
   * The list's "delete plastic" action. No per-card DELETE endpoint exists on
   * the server (only close/replace do) — a prior implementation's DELETE call
   * happened to hit a URL that collided with `deleteCardholder`, deleting the
   * whole cardholder line by accident. Closing is the closest real lifecycle
   * operation, so this repoints there while keeping the list's own pending
   * state independent of the "Close Card" form's `closeCardMutation`.
   */
  const deleteCardPlasticMutation = useMutation({
    mutationFn: ({ cardholderId, cardId }: { cardholderId: string; cardId: string }) =>
      unwrapAction(closeCardPlastic(accountId, cardholderId, cardId)),
    onSuccess: invalidateAccounts,
  });

  const reattributeMutation = useMutation({
    mutationFn: (body: BulkReattributeCardRequest) => unwrapAction(reattributeTransactionsToCard(body)),
    onSuccess: () => {
      invalidateAccounts();
      qc.invalidateQueries({ queryKey: keys.transactions.all });
    },
  });

  return {
    cardholdersQuery,
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
  };
}
