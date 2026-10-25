'use client';

// The picker for a `uuid` param with a `ref`: open credit cards (the account picker), open accounts or active loans.
// An optional param adds an "All …" choice that leaves it unset; a required one shows a placeholder until picked.
// A stored id that is no longer offered stays the current value, as a disabled "No longer available" option: an
// optional param offers a one-tap reset to "All …"; a required one reports itself so the form blocks saving.

import React from 'react';

import { Button, Select, type SelectOption, Text } from '@/components/ds';
import { AccountPicker } from '@/components/organisms';
import { isAccountClosed } from '@/lib/account.types';
import type { BuiltinParamResponse } from '@/lib/dashboards.types';
import { todayInAppZone } from '@/lib/date-range';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useActiveLoans } from '@/lib/query/hooks/useLoans';
import { AccountType } from '@/lib/types';

import { ALL_VALUE, type ParamRef, UNAVAILABLE_LABEL } from './paramsModel';


interface RefCopy {
  all: string;
  placeholder: string;
  empty: string;
  /** "This <noun> is no longer available". */
  noun: string;
}

const COPY: Record<ParamRef, RefCopy> = {
  credit_card: { all: 'All cards', placeholder: 'Choose a card', empty: 'No open credit cards', noun: 'card' },
  account: { all: 'All accounts', placeholder: 'Choose an account', empty: 'No open accounts', noun: 'account' },
  loan: { all: 'All loans', placeholder: 'Choose a loan', empty: 'No active loans', noun: 'loan' },
};

const ACCOUNT_TYPES: Record<'credit_card' | 'account', readonly AccountType[]> = {
  credit_card: [AccountType.CREDIT_CARD],
  account: [AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD, AccountType.BROKER, AccountType.GENERIC],
};

export interface RefFieldProps {
  param: BuiltinParamResponse;
  refKind: ParamRef;
  label: string;
  /** The picked id, or '' when unset ("All" for an optional param). */
  value: string;
  onValueChange: (value: string) => void;
  /** Called with whether `value` is a stored id no longer offered (the form blocks a required one). */
  onUnavailableChange?: (unavailable: boolean) => void;
}

export function RefField({ param, refKind, label, value, onValueChange, onUnavailableChange }: RefFieldProps) {
  const isLoan = refKind === 'loan';
  const accountsQuery = useAccounts(undefined, { enabled: !isLoan });
  const loansQuery = useActiveLoans({ enabled: isLoan });
  const copy = COPY[refKind];

  const accounts = React.useMemo(() => {
    const today = todayInAppZone();
    return (accountsQuery.data ?? []).filter((a) => !isAccountClosed(a, today));
  }, [accountsQuery.data]);
  const loans = loansQuery.data;

  const loading = isLoan ? loansQuery.isLoading : accountsQuery.isLoading;
  const loaded = isLoan ? loansQuery.isSuccess : accountsQuery.isSuccess;
  const offeredIds = React.useMemo(() => {
    if (isLoan) return (loans ?? []).map((l) => l.id);
    const types = ACCOUNT_TYPES[refKind as 'credit_card' | 'account'];
    return accounts.filter((a) => types.includes(a.type)).map((a) => a.id);
  }, [isLoan, loans, accounts, refKind]);
  const empty = !loading && offeredIds.length === 0;
  const unavailable = loaded && value !== '' && !offeredIds.includes(value);

  React.useEffect(() => {
    onUnavailableChange?.(unavailable);
  }, [unavailable, onUnavailableChange]);

  const leading: SelectOption[] = [
    ...(unavailable ? [{ value, label: UNAVAILABLE_LABEL, disabled: true }] : []),
    ...(param.required ? [] : [{ value: ALL_VALUE, label: copy.all }]),
  ];
  const selected = value === '' && !param.required ? ALL_VALUE : value;
  const pick = (v: string | null) => onValueChange(v === ALL_VALUE || v == null ? '' : v);

  const error = unavailable && param.required ? `This ${copy.noun} is no longer available. Choose another to save.` : undefined;

  return (
    <div className="flex flex-col gap-space-4">
      {isLoan ? (
        <Select
          label={label}
          placeholder={copy.placeholder}
          loading={loading}
          options={[...leading, ...(loans ?? []).map((l) => ({ value: l.id, label: l.name }))]}
          value={selected}
          error={error}
          onValueChange={(v) => pick(v as string)}
        />
      ) : (
        <AccountPicker
          label={label}
          placeholder={copy.placeholder}
          loading={loading}
          accounts={accounts}
          types={ACCOUNT_TYPES[refKind as 'credit_card' | 'account']}
          leadingOptions={leading}
          value={selected === '' ? null : selected}
          error={error}
          onValueChange={pick}
        />
      )}
      {unavailable && !param.required ? (
        <Text variant="caption" tone="ink-3" as="p">
          {`This ${copy.noun} is no longer available. `}
          <Button type="button" variant="link" onClick={() => onValueChange('')}>
            {`Use ${copy.all}`}
          </Button>
        </Text>
      ) : null}
      {empty ? (
        <Text variant="caption" tone="ink-3" as="p">
          {copy.empty}
          {param.required ? ' to choose from.' : `. The widget will show ${copy.all.toLowerCase()}.`}
        </Text>
      ) : null}
    </div>
  );
}
