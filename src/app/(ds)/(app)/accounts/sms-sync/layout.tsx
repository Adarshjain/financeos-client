import React from 'react';

import { AccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { SmsShell } from '@/features/accounts/sms/SmsShell';

/** The app bar above loading.tsx and page.tsx; AccountDialogs lets "Add as account" open the Add dialog in place. */
export default function DsSmsSyncLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountDialogs>
      <SmsShell>{children}</SmsShell>
    </AccountDialogs>
  );
}
