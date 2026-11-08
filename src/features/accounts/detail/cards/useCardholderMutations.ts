'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@/components/ds/Toast/Toast';
import { convertIdentifierToPastCard, deleteCardPlastic } from '@/features/accounts/accountActions';
import { useCardsDialogMutations } from '@/features/accounts/cards/useCardsDialogMutations';
import type {
  Card,
  Cardholder,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
} from '@/lib/account.types';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { PastCardRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { BulkReattributeCardRequest } from '@/lib/transaction.types';
import { useAppRouter } from '@/lib/useAppRouter';

import type { EditHolderBody } from './cardsFormsModel';

/** Resolves to null on success, or the message to show when the request failed. */
export type ActionResult = Promise<string | null>;

export interface CardholderActions {
  addPrimaryCard: (body: CreateCardRequest) => ActionResult;
  addHolder: (body: CreateCardholderRequest) => ActionResult;
  editHolder: (holder: Cardholder, body: EditHolderBody) => ActionResult;
  closeHolder: (holder: Cardholder, body: { closedOn?: string }) => ActionResult;
  reopenHolder: (holder: Cardholder) => ActionResult;
  deleteHolder: (holder: Cardholder) => ActionResult;
  addCard: (holder: Cardholder, body: CreateCardRequest) => ActionResult;
  addPastCard: (holder: Cardholder, body: CreateCardRequest) => ActionResult;
  /** The number is one of the account's other numbers: it becomes this closed card (the identifier goes). */
  convertToPastCard: (identifierId: string, body: PastCardRequest) => ActionResult;
  replaceCard: (holder: Cardholder, card: Card, body: ReplaceCardRequest) => ActionResult;
  closeCard: (holder: Cardholder, card: Card, body: { closedOn?: string }) => ActionResult;
  deleteCard: (holder: Cardholder, card: Card) => ActionResult;
  reassign: (body: BulkReattributeCardRequest) => ActionResult;
}

/**
 * Every mutation of the Cards tab. Each one shows the live app's toast and reloads the server data
 * on success, and returns the failure message otherwise so the caller can show it where it belongs.
 */
export function useCardholderMutations(accountId: string, isBank: boolean): CardholderActions {
  const router = useAppRouter();
  const m = useCardsDialogMutations(accountId, false);
  const qc = useQueryClient();

  // The live hook's "delete plastic" closes the card; the server now has a real DELETE.
  const deleteCardMutation = useMutation({
    mutationFn: ({ cardholderId, cardId }: { cardholderId: string; cardId: string }) =>
      unwrapAction(deleteCardPlastic(accountId, cardholderId, cardId)),
  });

  const run = async (
    work: () => Promise<unknown>,
    success: string | ((result: unknown) => string),
    failure: string
  ): ActionResult => {
    try {
      const result = await work();
      showToast(typeof success === 'function' ? success(result) : success);
      router.refresh();
      return null;
    } catch (err) {
      return getErrorMessage(err, failure);
    }
  };

  return {
    addPrimaryCard: (body) =>
      run(() => m.addPrimaryMutation.mutateAsync(body), 'Debit card added', "Couldn't add the debit card. Try again."),
    addHolder: (body) =>
      run(
        () => m.addAddonMutation.mutateAsync(body),
        isBank ? 'Joint holder added' : 'Add-on cardholder created',
        isBank ? "Couldn't add the joint holder. Try again." : "Couldn't add the add-on cardholder. Try again."
      ),
    editHolder: (holder, body) =>
      run(
        () => m.updateCardholderMutation.mutateAsync({ cardholderId: holder.id, body }),
        'Cardholder updated',
        "Couldn't update the cardholder. Try again."
      ),
    closeHolder: (holder, body) =>
      run(
        () => m.closeCardholderMutation.mutateAsync({ cardholderId: holder.id, body }),
        'Cardholder closed',
        "Couldn't close the cardholder. Try again."
      ),
    reopenHolder: (holder) =>
      run(
        () => m.reopenCardholderMutation.mutateAsync(holder.id),
        'Cardholder reopened',
        "Couldn't reopen the cardholder. Try again."
      ),
    deleteHolder: (holder) =>
      run(
        () => m.deleteCardholderMutation.mutateAsync(holder.id),
        'Cardholder deleted',
        "Couldn't delete the cardholder. Try again."
      ),
    addCard: (holder, body) =>
      run(
        () => m.addCardMutation.mutateAsync({ cardholderId: holder.id, body }),
        'Card issued',
        "Couldn't issue the card. Try again."
      ),
    addPastCard: (holder, body) =>
      run(
        () => m.addCardMutation.mutateAsync({ cardholderId: holder.id, body }),
        'Past card added',
        "Couldn't add the past card. Try again."
      ),
    convertToPastCard: (identifierId, body) =>
      run(
        async () => {
          const result = await unwrapAction(convertIdentifierToPastCard(accountId, identifierId, body));
          await Promise.all([
            qc.invalidateQueries({ queryKey: keys.accounts.all }),
            qc.invalidateQueries({ queryKey: keys.accounts.identifiers(accountId) }),
          ]);
          return result;
        },
        'Past card added',
        "Couldn't add the past card. Try again."
      ),
    replaceCard: (holder, card, body) =>
      run(
        () => m.replaceCardMutation.mutateAsync({ cardholderId: holder.id, cardId: card.id, body }),
        'Card replaced',
        "Couldn't replace the card. Try again."
      ),
    closeCard: (holder, card, body) =>
      run(
        () => m.closeCardMutation.mutateAsync({ cardholderId: holder.id, cardId: card.id, body }),
        'Card plastic closed',
        "Couldn't close the card. Try again."
      ),
    deleteCard: (holder, card) =>
      run(
        () => deleteCardMutation.mutateAsync({ cardholderId: holder.id, cardId: card.id }),
        'Card plastic deleted',
        "Couldn't delete the card. Try again."
      ),
    reassign: (body) =>
      run(
        () => m.reattributeMutation.mutateAsync(body),
        (res) => `${(res as { updatedCount: number }).updatedCount} transaction(s) reassigned`,
        "Couldn't reassign transactions. Try again."
      ),
  };
}
