import React from 'react';

import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';
import { accountNeedsBank } from '@/features/accounts/accountBankModel';
import type { Account } from '@/lib/account.types';
import { SharedName } from '@/lib/viewTransition';
import { transitionName } from '@/lib/viewTransitionNames';

/**
 * The account page title: bank accounts and credit cards lead with their bank's logo, or a letter tile without one.
 * The name is the end of the account row's name growing into the page (shared view transition).
 */
export function AccountTitle({ account }: { account: Account }) {
  const name = transitionName.account(account.id);
  if (!accountNeedsBank(account.type))
    return (
      <SharedName name={name}>
        <span>{account.name}</span>
      </SharedName>
    );
  const bank = 'bank' in account ? (account.bank ?? null) : null;
  return (
    <span className="flex items-center gap-space-8 min-w-0">
      {/* Room for the warning mark that sits above and right of the tile, so it never touches the crumb. */}
      <span className="inline-flex shrink-0 pt-space-4 pr-space-8">
        <BankLogo bankId={bank} name={account.name} warning={!bank} />
      </span>
      <SharedName name={name}>
        <span className="truncate">{account.name}</span>
      </SharedName>
    </span>
  );
}
