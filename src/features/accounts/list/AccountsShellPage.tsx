'use client';

import React from 'react';

import { useAccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { ShellPage } from '@/features/shell/ShellPage';

/** The Accounts list page shell: the app bar + opens Add account in place (inside AccountDialogs). */
export function AccountsShellPage({ children }: { children: React.ReactNode }) {
  const { open } = useAccountDialogs();
  return (
    <ShellPage crumb="Money" title="Accounts" onAdd={() => open()}>
      {children}
    </ShellPage>
  );
}
