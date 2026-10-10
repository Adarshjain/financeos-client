'use client';

// The picker for a `uuid` param with a `ref`: open credit cards, open accounts
// (grouped by type) or active loans. An optional param adds an "All …" choice
// that leaves it unset; a required one shows a placeholder until picked.
//
// A stored id that is no longer offered (a closed card or account, a loan no
// longer active, a deleted one) stays the current value, shown as a disabled
// "No longer available" option: an optional param offers a one-tap reset to
// "All …"; a required one reports itself (onUnavailableChange) so the form
// blocks saving until a valid pick.

import { useEffect, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Account, isAccountClosed } from '@/lib/account.types';
import type { BuiltinParamResponse } from '@/lib/dashboards.types';
import { todayInAppZone } from '@/lib/date-range';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useActiveLoans } from '@/lib/query/hooks/useLoans';
import { AccountType } from '@/lib/types';

import type { ParamRef } from './paramsModel';

/** The "All …" choice's value (Radix Select items cannot use ''). */
export const ALL_VALUE = '__all__';

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

/** The stale value's option ("No longer available" is never a pick). */
export const UNAVAILABLE_LABEL = 'No longer available';

const ACCOUNT_GROUPS: Array<{ type: AccountType; label: string }> = [
  { type: AccountType.BANK_ACCOUNT, label: 'Bank accounts' },
  { type: AccountType.CREDIT_CARD, label: 'Credit cards' },
  { type: AccountType.BROKER, label: 'Brokers' },
  { type: AccountType.GENERIC, label: 'Other accounts' },
];

interface Option {
  id: string;
  name: string;
}

interface Group {
  label: string | null;
  options: Option[];
}

function openAccounts(accounts: Account[]): Account[] {
  const today = todayInAppZone();
  return accounts.filter((a) => !isAccountClosed(a, today));
}

/**
 * The picker's options, grouped (only `account` has headed groups), whether
 * they are still loading, and whether they loaded (only then can a stored id
 * be judged no longer available).
 */
function useRefGroups(ref: ParamRef): { groups: Group[]; loading: boolean; loaded: boolean } {
  const accountsQuery = useAccounts(undefined, { enabled: ref !== 'loan' });
  const loansQuery = useActiveLoans({ enabled: ref === 'loan' });
  const accounts = accountsQuery.data;
  const loans = loansQuery.data;
  const loading = ref === 'loan' ? loansQuery.isLoading : accountsQuery.isLoading;
  const loaded = ref === 'loan' ? loansQuery.isSuccess : accountsQuery.isSuccess;
  const groups = useMemo((): Group[] => {
    if (ref === 'loan') return [{ label: null, options: (loans ?? []).map((l) => ({ id: l.id, name: l.name })) }];
    const open = openAccounts(Array.isArray(accounts) ? accounts : []);
    if (ref === 'credit_card') {
      return [{ label: null, options: open.filter((a) => a.type === AccountType.CREDIT_CARD) }];
    }
    return ACCOUNT_GROUPS.map((g) => ({ label: g.label, options: open.filter((a) => a.type === g.type) })).filter(
      (g) => g.options.length > 0,
    );
  }, [ref, accounts, loans]);
  return { groups, loading, loaded };
}

interface RefSelectProps {
  id: string;
  param: BuiltinParamResponse;
  refKind: ParamRef;
  /** The picked id, or '' when unset ("All" for an optional param). */
  value: string;
  onChange: (value: string) => void;
  /** Called with whether `value` is a stored id no longer offered (the form blocks a required one). */
  onUnavailableChange?: (unavailable: boolean) => void;
}

export function RefSelect({ id, param, refKind, value, onChange, onUnavailableChange }: RefSelectProps) {
  const { groups, loading, loaded } = useRefGroups(refKind);
  const copy = COPY[refKind];
  const empty = !loading && groups.every((g) => g.options.length === 0);
  const selected = value === '' && !param.required ? ALL_VALUE : value;
  const unavailable = loaded && value !== '' && !groups.some((g) => g.options.some((o) => o.id === value));

  useEffect(() => {
    onUnavailableChange?.(unavailable);
  }, [unavailable, onUnavailableChange]);

  return (
    <>
      <Select value={selected} onValueChange={(v) => onChange(v === ALL_VALUE ? '' : v)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={copy.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {unavailable && (
            <SelectItem value={value} disabled>
              {UNAVAILABLE_LABEL}
            </SelectItem>
          )}
          {!param.required && <SelectItem value={ALL_VALUE}>{copy.all}</SelectItem>}
          {groups.map((g) =>
            g.label ? (
              <SelectGroup key={g.label}>
                <SelectLabel>{g.label}</SelectLabel>
                {g.options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : (
              g.options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))
            ),
          )}
        </SelectContent>
      </Select>
      {unavailable &&
        (param.required ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">
            This {copy.noun} is no longer available. Choose another to save.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            This {copy.noun} is no longer available.{' '}
            <Button type="button" variant="link" size="micro" onClick={() => onChange('')}>
              Use {copy.all}
            </Button>
          </p>
        ))}
      {empty && (
        <p className="text-xs text-slate-500">
          {copy.empty}
          {param.required ? ' to choose from.' : ` — the widget will show ${copy.all.toLowerCase()}.`}
        </p>
      )}
    </>
  );
}
