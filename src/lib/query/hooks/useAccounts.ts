'use client';

import { useQuery } from '@tanstack/react-query';

import type { Account } from '@/lib/account.types';
import { unwrapAction } from '@/lib/actionResult';
import { loadAccount, loadAccounts } from '@/lib/query/actions/accountActions';
import { keys } from '@/lib/query/keys';

export function useAccounts(initialData?: Account[], { enabled = true }: { enabled?: boolean } = {}) {
  const query = useQuery<Account[]>({
    queryKey: keys.accounts.list(),
    queryFn: () => unwrapAction(loadAccounts()),
    initialData,
    enabled,
  });

  return query;
}

export function useAccount(id: string, initialData?: Account) {
  const query = useQuery<Account | null>({
    queryKey: keys.accounts.byId(id),
    queryFn: () => unwrapAction(loadAccount(id)),
    enabled: Boolean(id),
    initialData,
  });

  return query;
}
