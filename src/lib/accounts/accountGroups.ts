import type { SelectGroup, SelectOption } from '@/components/ds';
import { accountTypeLabel } from '@/features/accounts/form/ds/accountFormModel';
import { type AccountBase, isAccountClosed } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

/** What a picker needs of an account: every Account fits, and so does a bare `{ id, name, type }`. */
export type PickerAccount = Pick<AccountBase, 'id' | 'name' | 'closedOn'> & {
  type: AccountType;
  bank?: string | null;
  last4?: string;
  /** A broker's client id. */
  clientId?: string;
};

/** The order account types are listed in: bank, credit card, wallet, broker. */
export const ACCOUNT_GROUP_ORDER: readonly AccountType[] = [
  AccountType.BANK_ACCOUNT,
  AccountType.CREDIT_CARD,
  AccountType.GENERIC,
  AccountType.BROKER,
];

/** The default option for an account: its name, with closed ones marked. */
export function accountOption(account: PickerAccount): SelectOption {
  return { value: account.id, label: account.name, hint: isAccountClosed(account) ? 'Closed' : undefined };
}

/**
 * Select groups for accounts: only the given `types`, each under its type's label, always in bank, credit card, wallet,
 * broker order whatever the order of `types`. Empty groups are not listed.
 */
export function accountGroups(
  accounts: readonly PickerAccount[],
  types: readonly AccountType[],
  toOption: (account: PickerAccount) => SelectOption = accountOption,
): SelectGroup[] {
  return ACCOUNT_GROUP_ORDER.filter((type) => types.includes(type))
    .map((type) => ({
      name: accountTypeLabel(type),
      options: accounts.filter((a) => a.type === type).map(toOption),
    }))
    .filter((g) => g.options.length > 0);
}
