import { notFound } from 'next/navigation';
import React from 'react';

import { loadAccount } from '@/features/accounts/detail/accountData';
import { AccountTabs } from '@/features/accounts/detail/AccountTabs';
import { AccountTitle } from '@/features/accounts/detail/AccountTitle';
import { AccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { ShellPage } from '@/features/shell/ShellPage';

export default async function DsAccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await loadAccount(id);
  if (!account) notFound();

  return (
    <AccountDialogs account={account}>
      <ShellPage crumb="Money / Accounts" title={<AccountTitle account={account} />} backHref="/ds/accounts" flushTop>
        <div className="flex flex-col gap-space-12 desk:gap-space-16">
          <AccountTabs accountId={account.id} type={account.type} />
          {children}
        </div>
      </ShellPage>
    </AccountDialogs>
  );
}
