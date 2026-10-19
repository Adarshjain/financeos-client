'use client';

import { useSearchParams } from 'next/navigation';
import React from 'react';

import type { Account } from '@/lib/account.types';
import { closeDialogParam } from '@/lib/dialogParam';
import { AccountType } from '@/lib/types';

import { AccountFormDialog } from './AccountFormDialog';
import { parseAddType } from './accountFormModel';

/** Opens Add account over the list from `?add=1` (Bank picked) or `?add=<type>` (that type picked). */
export function AddAccountHost() {
  const search = useSearchParams();
  const close = () => closeDialogParam('add');
  const add = search.get('add');
  if (!add) return null;
  return <AccountFormDialog key={add} initialType={parseAddType(add) ?? AccountType.BANK_ACCOUNT} onClose={close} />;
}

/** Opens Edit account over an account page from `?edit=1`. */
export function EditAccountHost({ account }: { account: Account }) {
  const search = useSearchParams();
  const close = () => closeDialogParam('edit');
  if (!search.get('edit')) return null;
  return <AccountFormDialog account={account} onClose={close} />;
}
