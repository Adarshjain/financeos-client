'use client';

import React from 'react';

import { ErrorState } from '@/components/organisms';
import { ShellPage } from '@/features/shell/ShellPage';

export default function DsTransactionsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ShellPage crumb="Money" title="Transactions">
      <ErrorState
        title="Could not load transactions"
        description="The request failed. Try again, and quote the reference if it keeps failing."
        action={{ label: 'Try again', onSelect: reset }}
        reference={error.digest}
      />
    </ShellPage>
  );
}
