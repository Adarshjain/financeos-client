'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Cardholder,
  CloseCardholderRequest,
  CloseCardRequest,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { BulkReattributeCardRequest, BulkReattributeResponse } from '@/lib/transaction.types';

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
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/accounts/{accountId}/cardholders', {
        params: { path: { accountId } },
      });
      return (data as Cardholder[]) ?? [];
    },
    enabled: open,
  });

  const addPrimaryMutation = useMutation({
    mutationFn: (body: CreateCardRequest) =>
      api
        .POST('/api/v1/accounts/{accountId}/cardholders/primary', {
          params: { path: { accountId } },
          body: body as Schemas['CreateCardRequest'],
        })
        .then((r) => r.data as Cardholder),
    onSuccess: invalidateAccounts,
  });

  const addAddonMutation = useMutation({
    mutationFn: (body: CreateCardholderRequest) =>
      api
        .POST('/api/v1/accounts/{accountId}/cardholders', {
          params: { path: { accountId } },
          body: body as Schemas['CreateCardholderRequest'],
        })
        .then((r) => r.data as Cardholder),
    onSuccess: invalidateAccounts,
  });

  const updateCardholderMutation = useMutation({
    mutationFn: ({ cardholderId, body }: { cardholderId: string; body: UpdateCardholderRequest }) =>
      api
        .PUT('/api/v1/accounts/{accountId}/cardholders/{cardholderId}', {
          params: { path: { accountId, cardholderId } },
          body: body as Schemas['UpdateCardholderRequest'],
        })
        .then((r) => r.data as Cardholder),
    onSuccess: invalidateAccounts,
  });

  const closeCardholderMutation = useMutation({
    mutationFn: ({ cardholderId, body }: { cardholderId: string; body?: CloseCardholderRequest }) =>
      api
        .POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/close', {
          params: { path: { accountId, cardholderId } },
          body,
        })
        .then((r) => r.data as Cardholder),
    onSuccess: invalidateAccounts,
  });

  const reopenCardholderMutation = useMutation({
    mutationFn: (cardholderId: string) =>
      api
        .POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/reopen', {
          params: { path: { accountId, cardholderId } },
        })
        .then((r) => r.data as Cardholder),
    onSuccess: invalidateAccounts,
  });

  const deleteCardholderMutation = useMutation({
    mutationFn: (cardholderId: string) =>
      api.DELETE('/api/v1/accounts/{accountId}/cardholders/{cardholderId}', {
        params: { path: { accountId, cardholderId } },
      }),
    onSuccess: invalidateAccounts,
  });

  const addCardMutation = useMutation({
    mutationFn: ({ cardholderId, body }: { cardholderId: string; body: CreateCardRequest }) =>
      api
        .POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards', {
          params: { path: { accountId, cardholderId } },
          body: body as Schemas['CreateCardRequest'],
        })
        .then((r) => r.data as Cardholder),
    onSuccess: invalidateAccounts,
  });

  const replaceCardMutation = useMutation({
    mutationFn: ({ cardholderId, cardId, body }: { cardholderId: string; cardId: string; body: ReplaceCardRequest }) =>
      api
        .POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/replace', {
          params: { path: { accountId, cardholderId, cardId } },
          body,
        })
        .then((r) => r.data as Cardholder),
    onSuccess: invalidateAccounts,
  });

  const closeCardMutation = useMutation({
    mutationFn: ({ cardholderId, cardId, body }: { cardholderId: string; cardId: string; body?: CloseCardRequest }) =>
      api
        .POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/close', {
          params: { path: { accountId, cardholderId, cardId } },
          body,
        })
        .then((r) => r.data as Cardholder),
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
      api
        .POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/close', {
          params: { path: { accountId, cardholderId, cardId } },
        })
        .then((r) => r.data as Cardholder),
    onSuccess: invalidateAccounts,
  });

  const reattributeMutation = useMutation({
    mutationFn: (body: BulkReattributeCardRequest) =>
      api
        .PATCH('/api/v1/transactions/card', {
          body: body as Schemas['BulkReattributeCardRequest'],
        })
        .then((r) => r.data as BulkReattributeResponse),
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
