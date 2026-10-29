'use client';

import React from 'react';

import { useAccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

/** The Accounts list page shell: the app bar + opens Add account in place (inside AccountDialogs). */
export function AccountsShell({ children }: { children: React.ReactNode }) {
  const { open, loading } = useAccountDialogs();
  return (
    <ShellPage crumb={areaCrumb('accounts')} title="Accounts" onAdd={() => open()} addLoading={loading} addLabel="Add account">
      {children}
    </ShellPage>
  );
}
