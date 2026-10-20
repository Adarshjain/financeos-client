import React from 'react';

import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

/** The account page title: bank accounts and credit cards lead with their bank's logo, or a letter tile without one. */
export function AccountTitle({ account }: { account: Account }) {
  const isBanked =
    account.type === AccountType.BANK_ACCOUNT || account.type === AccountType.CREDIT_CARD;
  if (!isBanked) return <>{account.name}</>;
  return (
    <span className="flex items-center gap-space-8 min-w-0">
      <BankLogo bankId={account.bank ?? null} name={account.name} />
      <span className="truncate">{account.name}</span>
    </span>
  );
}
