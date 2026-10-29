'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ErrorState } from '@/components/organisms';

/** A list that failed to load: say what failed, offer Retry, quote the reference. */
export function LoansLoadError({ what, reference }: { what: string; reference?: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title={`Couldn't load ${what}`}
      description="If it keeps failing, quote the reference."
      action={{ label: 'Retry', onSelect: () => router.refresh() }}
      reference={reference}
    />
  );
}
