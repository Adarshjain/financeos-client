import React from 'react';

import { AccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { subCrumb } from '@/features/shell/navigation';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import type { Account } from '@/lib/account.types';

import { AccountTabs } from './AccountTabs';
import { AccountTitle } from './AccountTitle';

/** The app bar, tab strip and dialogs an account's pages share. The tabs read the active one from the address. */
export function AccountShell({ account, children }: { account: Account; children: React.ReactNode }) {
  return (
    <AccountDialogs account={account}>
      <ShellPage crumb={subCrumb('accounts')} title={<AccountTitle account={account} />} backHref={appHref('/accounts')} flushTop>
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
          <AccountTabs accountId={account.id} type={account.type} />
          {children}
        </div>
      </ShellPage>
    </AccountDialogs>
  );
}
