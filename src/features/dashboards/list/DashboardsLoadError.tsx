'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ErrorState } from '@/components/organisms';

/** The list failed to load: say what failed, offer Try again, quote the reference. */
export function DashboardsLoadError({ reference }: { reference?: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title="Couldn't load dashboards"
      description="If it keeps failing, quote the reference."
      action={{ label: 'Retry', onSelect: () => router.refresh() }}
      reference={reference}
    />
  );
}
