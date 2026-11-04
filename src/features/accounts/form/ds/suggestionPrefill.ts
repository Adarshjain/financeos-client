import { type SuggestionItem, suggestionTitle, withBankName } from '@/features/accounts/list/suggestionsModel';
import { BANKS } from '@/features/banks/banks';
import { formatMoney } from '@/lib/format';
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
  creditLimit: boolean;
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
  /** Under the credit limit when the statements only show a range, else null. */
  limitHint: string | null;
  /** Under the statement password when the server builds it from the profile, else null. */
  passwordCaption: string | null;
}

const lakh = (n: number) => formatMoney(n * 100000, { compact: true });

/** The hint for a limit bucket from the server ("<1L", "1-3L", "3-5L", "5-10L", ">10L"), or null for one we don't know. */
export function limitHintOf(bucket: string | null | undefined): string | null {
  const b = bucket?.trim() ?? '';
  const under = /^<(\d+)L$/.exec(b);
  if (under) return `Your statements show a limit under ${lakh(Number(under[1]))}.`;
  const over = /^>(\d+)L$/.exec(b);
  if (over) return `Your statements show a limit over ${lakh(Number(over[1]))}.`;
  const range = /^(\d+)-(\d+)L$/.exec(b);
  if (range) return `Your statements show a limit of ${lakh(Number(range[1]))}–${lakh(Number(range[2]))}.`;
  return null;
}

/** The form's bank value for the server's issuer id, or '' when the form has no such bank. */
export function bankValueOf(item: Pick<SuggestionItem, 'bank'>): string {
  return BANKS.find((b) => b.id === item.bank.id)?.id ?? '';
}

/** The date part (yyyy-mm-dd) of the suggestion's first email, for "Import emails from"; '' when the server has none. */
export function ingestFromOf(item: Pick<SuggestionItem, 'firstSeenOn'>): string {
  return /^\d{4}-\d{2}-\d{2}/.exec(item.firstSeenOn?.trim() ?? '')?.[0] ?? '';
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
 * The Add account form's starting point for a suggestion. A credit card's exact limit is filled when the statements state one (a range only
 * becomes a hint). The statement password and earlier numbers are never prefilled. A card that belongs to an account we don't have yet (a debit, add-on or replacement card
 * without its parent) opens the type it belongs to with only its number and bank filled in. "Import emails from" starts at the
 * suggestion's first email, so the new account imports its transactions.
 */
export function buildSuggestionPrefill(item: SuggestionItem): SuggestionPrefill {
  const bankKind = item.kind === 'BANK_ACCOUNT' || item.kind === 'DEBIT_CARD';
  const type = bankKind ? AccountType.BANK_ACCOUNT : AccountType.CREDIT_CARD;
  const isAccount = item.kind === 'BANK_ACCOUNT' || item.kind === 'CREDIT_CARD';
  const children = item.children ?? [];
  const values = emptyValues(type);

  values.bank = bankValueOf(item);
  values.ingestFromDate = ingestFromOf(item);
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

  const limit = item.kind === 'CREDIT_CARD' && item.limitAmount && item.limitAmount > 0 ? item.limitAmount : null;
  if (limit !== null) values.creditLimit = String(limit);

  return {
    values,
    filled: {
      name: values.name !== '',
      bank: values.bank !== '',
      last4: values.last4 !== '',
      debitCardLast4: values.debitCardLast4 !== '',
      creditLimit: limit !== null,
      addonCards: values.addonCards.map((c) => c.last4).filter(Boolean),
    },
    nameHints: nameHintsOf(item),
    limitHint: item.kind === 'CREDIT_CARD' && limit === null ? limitHintOf(item.limitBucket) : null,
    passwordCaption: item.passwordFromProfile
      ? `From your name and birth date (${item.bank.name} rule). Type one to use a different password.`
      : null,
  };
}
