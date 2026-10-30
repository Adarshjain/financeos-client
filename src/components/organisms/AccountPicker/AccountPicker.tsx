'use client';

import React from 'react';

import { Select, type SelectGroup, type SelectOption, type SelectProps } from '@/components/ds/Select/Select';
import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';
import { bankById } from '@/features/banks/banks';
import { accountGroups, accountOption, type PickerAccount } from '@/lib/accounts/accountGroups';
import { AccountType } from '@/lib/types';

type AccountPickerBase = Omit<
  SelectProps,
  'options' | 'groups' | 'multiple' | 'searchable' | 'filter' | 'value' | 'defaultValue' | 'onValueChange'
>;

export type AccountPickerProps = AccountPickerBase & {
  /** Every account the caller has (full accounts, or just `{ id, name, type }`); the picker keeps the ones whose type is in `types`. */
  accounts: readonly PickerAccount[];
  /** Which account types to list, such as `[AccountType.CREDIT_CARD]`. They always show in bank, credit card, wallet, broker order. */
  types: readonly AccountType[];
  /** Call-site extras shown first, ungrouped, such as an "Unattributed" option. */
  leadingOptions?: SelectOption[];
} & (
    | {
        multiple?: false;
        value?: string | null;
        defaultValue?: string | null;
        onValueChange?: (value: string | null) => void;
      }
    | {
        multiple: true;
        value?: string[];
        defaultValue?: string[];
        onValueChange?: (value: string[]) => void;
      }
  );

const hasBankLogo = (type: AccountType) => type === AccountType.BANK_ACCOUNT || type === AccountType.CREDIT_CARD;

/** One account as a Select option: bank and card accounts carry a bank logo (a letter tile when the bank is unknown), searchable by name, bank, last four and (brokers) client id; a broker with a client id is labelled "Name · clientId". */
function pickerOption(account: PickerAccount): SelectOption {
  const bank = account.bank ?? null;
  const { last4 } = account;
  const clientId = account.type === AccountType.BROKER ? account.clientId : undefined;
  const base = accountOption(account);
  return {
    ...base,
    label: clientId ? `${account.name} · ${clientId}` : base.label,
    icon: hasBankLogo(account.type) ? <BankLogo bankId={bank} name={account.name} warning={false} /> : undefined,
    searchText: [account.name, bankById(bank)?.name, bank, last4, clientId].filter(Boolean).join(' '),
  };
}

/**
 * The account dropdown used everywhere: single or multiple, only the account types asked for, always grouped by type,
 * always searchable (name, bank, last four, broker client id).
 */
export const AccountPicker = React.forwardRef<HTMLButtonElement, AccountPickerProps>(function AccountPicker(
  { accounts, types, leadingOptions, multiple, value, defaultValue, onValueChange, searchPlaceholder = 'Search accounts', ...rest },
  ref,
) {
  const groups = React.useMemo<SelectGroup[]>(() => {
    const typed = accountGroups(accounts, types, pickerOption);
    return leadingOptions && leadingOptions.length > 0 ? [{ name: '', options: leadingOptions }, ...typed] : typed;
  }, [accounts, types, leadingOptions]);

  const selectProps = multiple
    ? {
        value: value as string[] | undefined,
        defaultValue: defaultValue as string[] | undefined,
        onValueChange: (v: string | string[]) => (onValueChange as ((v: string[]) => void) | undefined)?.(v as string[]),
      }
    : {
        value: value === undefined ? undefined : (value ?? ''),
        defaultValue: defaultValue === undefined ? undefined : (defaultValue as string | null) ?? '',
        onValueChange: (v: string | string[]) =>
          (onValueChange as ((v: string | null) => void) | undefined)?.((v as string) || null),
      };

  return (
    <Select
      ref={ref}
      {...rest}
      multiple={multiple}
      searchable
      searchPlaceholder={searchPlaceholder}
      groups={groups}
      {...selectProps}
    />
  );
});

AccountPicker.displayName = 'AccountPicker';
