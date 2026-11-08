'use server';

import type { Account } from '@/lib/account.types';
import type { components } from '@/lib/api/schema';
import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

/** The wire type is the generated `AccountResponse` union; the app models accounts with its own `Account` union. */
export const loadAccounts = action('query.account.loadAccounts', createDomainAction(
  { fallbackError: "Couldn't load accounts. Try again." },
  async (): Promise<Account[]> => {
    const { data } = await serverApi.GET('/api/v1/accounts');
    return (data ?? []) as unknown as Account[];
  },
));

export const loadAccount = action('query.account.loadAccount', createDomainAction(
  { fallbackError: "Couldn't load the account. Try again." },
  async (id: string): Promise<Account | null> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{id}', { params: { path: { id } } });
    return (data ?? null) as unknown as Account | null;
  },
));

/** An account's end-of-day balances for the last `days` days, oldest first. */
export const loadBalanceSeries = action('query.account.loadBalanceSeries', createDomainAction(
  { fallbackError: "Couldn't load the balance history. Try again." },
  async (accountId: string, days: number): Promise<components['schemas']['BalancePointResponse'][]> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{id}/balance-series', {
      params: { path: { id: accountId }, query: { days } },
    });
    return data ?? [];
  },
));
