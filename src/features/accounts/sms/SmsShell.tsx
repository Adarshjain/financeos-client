'use client';

import React from 'react';

import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

/** The frame of `/accounts/sms-sync`, a sub-page of Accounts: the top bar with a back arrow to /accounts, then the page. */
export function SmsShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellPage crumb={subCrumb('accounts')} title="SMS sync">
      {children}
    </ShellPage>
  );
}
