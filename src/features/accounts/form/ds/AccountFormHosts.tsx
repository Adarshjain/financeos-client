'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountFormDialog } from './AccountFormDialog';
import { hrefWithoutParam, parseAddType } from './accountFormModel';

function useCloseParam(key: string) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  return () => router.replace(hrefWithoutParam(pathname, search, key), { scroll: false });
}

/** Opens Add account over the list from `?add=1` (Bank picked) or `?add=<type>` (that type picked). */
export function AddAccountHost() {
  const search = useSearchParams();
  const close = useCloseParam('add');
  const add = search.get('add');
  if (!add) return null;
  return <AccountFormDialog key={add} initialType={parseAddType(add) ?? AccountType.BANK_ACCOUNT} onClose={close} />;
}

/** Opens Edit account over an account page from `?edit=1`. */
export function EditAccountHost({ account }: { account: Account }) {
  const search = useSearchParams();
  const close = useCloseParam('edit');
  if (!search.get('edit')) return null;
  return <AccountFormDialog account={account} onClose={close} />;
}
