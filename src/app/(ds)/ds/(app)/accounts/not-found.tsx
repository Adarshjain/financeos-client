'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { EmptyState } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

/** Shown when an account id does not exist. It sits above [id] because the account layout is what raises it. */
export default function DsAccountNotFound() {
  const router = useRouter();
  return (
    <ShellPage crumb="Money" title="Accounts">
      <EmptyState
        title="Account not found"
        description="It may have been deleted."
        action={{ label: 'Back to accounts', onSelect: () => router.push('/ds/accounts') }}
      />
    </ShellPage>
  );
}
