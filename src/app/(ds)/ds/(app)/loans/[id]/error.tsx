'use client';

import React from 'react';

import { ErrorState } from '@/components/organisms';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';

export default function DsLoanError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ShellPage crumb="Owe & lend / Loans" title="Loan" backHref={appHref('/loans')}>
      <ErrorState
        title="Could not load this loan"
        description="The request failed. Try again, and quote the reference if it keeps failing."
        action={{ label: 'Try again', onSelect: reset }}
        reference={error.digest}
      />
    </ShellPage>
  );
}
