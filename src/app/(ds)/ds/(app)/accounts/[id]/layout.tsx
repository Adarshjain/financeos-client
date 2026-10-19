import { notFound } from 'next/navigation';
import React from 'react';

import { loadAccount } from '@/features/accounts/detail/accountData';
import { AccountTabs } from '@/features/accounts/detail/AccountTabs';
import { EditAccountHost } from '@/features/accounts/form/ds/AccountFormHosts';
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
    <ShellPage crumb="Money / Accounts" title={account.name} backHref="/ds/accounts">
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <AccountTabs accountId={account.id} type={account.type} />
        {children}
      </div>
      <EditAccountHost account={account} />
    </ShellPage>
  );
}
