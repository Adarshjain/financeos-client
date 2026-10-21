'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ErrorState } from '@/components/organisms';

/** A list that failed to load: say what failed, offer Try again, quote the reference. */
export function LoansLoadError({ what, reference }: { what: string; reference?: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title={`Could not load ${what}`}
      description={`The ${what} request failed. Try again, and quote the reference if it keeps failing.`}
      action={{ label: 'Try again', onSelect: () => router.refresh() }}
      reference={reference}
    />
  );
}
