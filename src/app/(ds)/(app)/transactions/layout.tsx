import React from 'react';

import { AccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';

/** Add account opens in place from the first-run state, so the page sits inside its dialog provider. */
export default function DsTransactionsLayout({ children }: { children: React.ReactNode }) {
  return <AccountDialogs>{children}</AccountDialogs>;
}
