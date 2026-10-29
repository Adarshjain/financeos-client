import React from 'react';

import { AccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { AccountsShellPage } from '@/features/accounts/list/AccountsShellPage';

/** Holds the Add dialog state and the app bar above loading.tsx and page.tsx, so the top-bar + works while the list loads. */
export default function DsAccountsListLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountDialogs>
      <AccountsShellPage>{children}</AccountsShellPage>
    </AccountDialogs>
  );
}
