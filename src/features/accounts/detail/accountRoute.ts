import { notFound } from 'next/navigation';

import type { Account } from '@/lib/account.types';

import { loadAccount } from './accountData';

/** The account for a route, or the not-found page when it is missing or `accepts` turns it down (a tab it has none of). */
export async function requireAccount(id: string, accepts?: (account: Account) => boolean): Promise<Account> {
  const account = await loadAccount(id);
  if (!account || (accepts && !accepts(account))) notFound();
  return account;
}
