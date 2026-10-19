import React from 'react';

import { AccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';

/** Holds the Add dialog state above loading.tsx and page.tsx, so the top-bar + works while the list loads. */
export default function DsAccountsListLayout({ children }: { children: React.ReactNode }) {
  return <AccountDialogs>{children}</AccountDialogs>;
}
