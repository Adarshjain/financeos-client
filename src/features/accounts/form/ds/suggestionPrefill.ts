import { type SuggestionItem, suggestionTitle, withBankName } from '@/features/accounts/list/suggestionsModel';
import { BANKS } from '@/features/banks/banks';
import { AccountType } from '@/lib/types';

import { type AccountFormValues, emptyValues } from './accountFormModel';

/** The caption under every field that was filled in from a suggestion. */
export const FROM_EMAIL_CAPTION = 'From your email';
export const FROM_EMAIL_SUBTITLE = 'Filled in from your email. Check it, then create.';

/** Which fields of the form were filled in from the suggestion (and so carry the caption). */
export interface PrefilledFields {
  name: boolean;
  bank: boolean;
  last4: boolean;
  debitCardLast4: boolean;
  /** The add-on numbers filled in; a row keeps its caption while it still holds one of them. */
  addonCards: string[];
}

export interface NameHint {
  candidate: string;
  /** The name tapping it sets. */
  name: string;
}

export interface SuggestionPrefill {
  values: AccountFormValues;
  filled: PrefilledFields;
  /** The card names the emails mention when the server isn't sure which one it is (two or more, or one the server is unsure of). */
  nameHints: NameHint[];
}

/** The form's bank value for the server's issuer id, or '' when the form has no such bank. */
export function bankValueOf(item: Pick<SuggestionItem, 'bank'>): string {
  return BANKS.find((b) => b.id === item.bank.id)?.id ?? '';
}

/** "A and B", or "A, B and C". */
export function joinCandidates(candidates: readonly string[]): string {
  if (candidates.length <= 1) return candidates.join('');
  return `${candidates.slice(0, -1).join(', ')} and ${candidates[candidates.length - 1]}`;
}

function nameHintsOf(item: SuggestionItem): NameHint[] {
  if (item.kind !== 'CREDIT_CARD') return [];
  const candidates = (item.variantCandidates ?? []).filter((c) => c.trim());
  if (candidates.length < 2 && !(candidates.length === 1 && item.variantConf === 'LOW')) return [];
  return candidates.map((candidate) => ({ candidate, name: withBankName(item, candidate) }));
}

/**
 * The Add account form's starting point for a suggestion. The credit limit, statement password and earlier numbers
 * are never prefilled. A card that belongs to an account we don't have yet (a debit, add-on or replacement card
 * without its parent) opens the type it belongs to with only its number and bank filled in.
 */
export function buildSuggestionPrefill(item: SuggestionItem): SuggestionPrefill {
  const bankKind = item.kind === 'BANK_ACCOUNT' || item.kind === 'DEBIT_CARD';
  const type = bankKind ? AccountType.BANK_ACCOUNT : AccountType.CREDIT_CARD;
  const isAccount = item.kind === 'BANK_ACCOUNT' || item.kind === 'CREDIT_CARD';
  const children = item.children ?? [];
  const values = emptyValues(type);

  values.bank = bankValueOf(item);
  if (isAccount) values.name = suggestionTitle(item);
  const number = item.last4?.trim() ?? '';

  if (item.kind === 'DEBIT_CARD') {
    values.debitCardLast4 = number;
  } else {
    values.last4 = number;
  }
  if (item.kind === 'BANK_ACCOUNT') {
    values.debitCardLast4 = children.find((c) => c.kind === 'DEBIT_CARD')?.last4?.trim() ?? '';
  }
  if (item.kind === 'CREDIT_CARD') {
    values.addonCards = children
      .filter((c) => c.kind === 'ADDON_CARD')
      .map((c) => ({ last4: c.last4?.trim() ?? '', relationship: '', holderName: '' }));
  }

  return {
    values,
    filled: {
      name: values.name !== '',
      bank: values.bank !== '',
      last4: values.last4 !== '',
      debitCardLast4: values.debitCardLast4 !== '',
      addonCards: values.addonCards.map((c) => c.last4).filter(Boolean),
    },
    nameHints: nameHintsOf(item),
  };
}
