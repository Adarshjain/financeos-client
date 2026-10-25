import { orNull } from '@/features/shell/loadHelpers';
import { accountsApi, categoriesApi } from '@/lib/apiClient';
import { rewardEligibleAccounts } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

export interface WhichCardOption {
  id: string;
  name: string;
}

/** A credit card that can be compared; the bank and last four let the picker show its logo and search by them. */
export interface WhichCardCard extends WhichCardOption {
  bank?: string | null;
  last4?: string;
}

export interface WhichCardData {
  /** The credit cards that can be compared. */
  cards: WhichCardCard[];
  categories: WhichCardOption[];
}

/**
 * What the Which card? form needs, loaded once on the server: the open credit cards and the categories.
 * Null when either request failed, so the page shows its error state instead of a form that cannot be filled.
 */
export async function loadWhichCardData(): Promise<WhichCardData | null> {
  const [accounts, categories] = await Promise.all([orNull(accountsApi.list()), orNull(categoriesApi.list())]);
  if (!accounts || !categories) return null;
  return {
    cards: rewardEligibleAccounts(accounts)
      .filter((a) => a.type === AccountType.CREDIT_CARD)
      .map((a) => ({ id: a.id, name: a.name, bank: 'bank' in a ? a.bank : undefined, last4: 'last4' in a ? a.last4 : undefined })),
    categories: categories.map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
