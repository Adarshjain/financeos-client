'use client';

import { AddCardDialog, ReplaceCardDialog } from '@/features/accounts/detail/cards/CardFormDialogs';
import { holderName } from '@/features/accounts/detail/cards/cardsModel';
import { AddHolderDialog } from '@/features/accounts/detail/cards/HolderFormDialogs';
import { useCardholderMutations } from '@/features/accounts/detail/cards/useCardholderMutations';
import type { Account, Card, Cardholder } from '@/lib/account.types';
import { todayInAppZone } from '@/lib/date-range';
import { AccountType } from '@/lib/types';

import type { SuggestionItem } from './suggestionsModel';

/** A card found in the emails for an account we already have, and where it goes on that account. */
export type SuggestionCardTarget =
  | { kind: 'ADDON_CARD'; item: SuggestionItem; parent: Account }
  /** `holder` is the primary holder; null when the account has none yet (the debit card then creates it). */
  | { kind: 'DEBIT_CARD'; item: SuggestionItem; parent: Account; holder: Cardholder | null }
  | { kind: 'REPLACEMENT_CARD'; item: SuggestionItem; parent: Account; holder: Cardholder; card: Card };

/**
 * The account's own card dialogs (add-on holder, add a card, replace a card), opened from the Accounts list with the
 * card number filled in from the suggestion. Creating sends the suggestion's id so the server marks it added.
 */
export function SuggestionCardDialog({ target, onClose }: { target: SuggestionCardTarget; onClose: () => void }) {
  const { item, parent } = target;
  const isBank = parent.type === AccountType.BANK_ACCOUNT;
  const actions = useCardholderMutations(parent.id, isBank);
  const today = todayInAppZone();
  const fromSuggestion = { id: item.id, last4: item.last4 ?? '' };

  switch (target.kind) {
    case 'ADDON_CARD':
      return (
        <AddHolderDialog
          isBank={false}
          accountName={parent.name}
          today={today}
          fromSuggestion={fromSuggestion}
          onSubmit={actions.addHolder}
          onClose={onClose}
        />
      );
    case 'DEBIT_CARD': {
      const { holder } = target;
      return (
        <AddCardDialog
          title={holder ? 'Add a card' : 'Add your debit card'}
          description={holder ? `${holderName(holder, true)} · ${parent.name}` : parent.name}
          submitLabel={holder ? 'Add card' : 'Add debit card'}
          last4Message="Card last 4 digits must be exactly 4 digits."
          today={today}
          fromSuggestion={fromSuggestion}
          onSubmit={(body) => (holder ? actions.addCard(holder, body) : actions.addPrimaryCard(body))}
          onClose={onClose}
        />
      );
    }
    case 'REPLACEMENT_CARD':
      return (
        <ReplaceCardDialog
          card={target.card}
          holderName={holderName(target.holder, isBank)}
          today={today}
          fromSuggestion={fromSuggestion}
          onSubmit={(body) => actions.replaceCard(target.holder, target.card, body)}
          onClose={onClose}
        />
      );
  }
}

export const loadSuggestionCardDialog = () => import('./SuggestionCardDialog').then((m) => m.SuggestionCardDialog);
