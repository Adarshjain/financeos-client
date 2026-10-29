'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ErrorState } from '@/components/organisms';

/** The list failed to load: say what failed, offer Retry, quote the reference. */
export function TransactionsLoadError({ reference }: { reference?: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title="Couldn't load transactions"
      description="Retry, and quote the reference if it keeps failing."
      action={{ label: 'Retry', onSelect: () => router.refresh() }}
      reference={reference}
    />
  );
}
