'use client';

import React from 'react';

import { ErrorState } from '@/components/organisms';

export default function DsAccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Could not load this account"
      description="The request failed. Try again, and quote the reference if it keeps failing."
      action={{ label: 'Try again', onSelect: reset }}
      reference={error.digest}
    />
  );
}
