import React from 'react';

import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';
import { accountNeedsBank } from '@/features/accounts/accountBank';
import type { Account } from '@/lib/account.types';

/** The account page title: bank accounts and credit cards lead with their bank's logo, or a letter tile without one. */
export function AccountTitle({ account }: { account: Account }) {
  if (!accountNeedsBank(account.type)) return <>{account.name}</>;
  const bank = 'bank' in account ? (account.bank ?? null) : null;
  return (
    <span className="flex items-center gap-space-8 min-w-0">
      <BankLogo bankId={bank} name={account.name} warning={!bank} />
      <span className="truncate">{account.name}</span>
    </span>
  );
}
