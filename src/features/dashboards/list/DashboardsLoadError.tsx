'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ErrorState } from '@/components/organisms';

/** The list failed to load: say what failed, offer Try again, quote the reference. */
export function DashboardsLoadError({ reference }: { reference?: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title="Could not load dashboards"
      description="The dashboards request failed. Try again, and quote the reference if it keeps failing."
      action={{ label: 'Try again', onSelect: () => router.refresh() }}
      reference={reference}
    />
  );
}
