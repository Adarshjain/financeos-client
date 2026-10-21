'use client';

import React from 'react';

import { ErrorState } from '@/components/organisms';
import { LENDINGS_HREF } from '@/features/loans/loansLendingsTabs';
import { ShellPage } from '@/features/shell/ShellPage';

export default function DsPersonError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ShellPage crumb="Owe & lend / Lendings" title="Person" backHref={LENDINGS_HREF}>
      <ErrorState
        title="Could not load this person"
        description="The request failed. Try again, and quote the reference if it keeps failing."
        action={{ label: 'Try again', onSelect: reset }}
        reference={error.digest}
      />
    </ShellPage>
  );
}
