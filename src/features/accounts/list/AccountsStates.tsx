'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { EmptyState } from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import { openDialogParam } from '@/lib/dialogParam';

export function AccountsLoadError({ reference }: { reference?: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title="Could not load accounts"
      description="The accounts request failed. Try again, and quote the reference if it keeps failing."
      action={{ label: 'Try again', onSelect: () => router.refresh() }}
      reference={reference}
    />
  );
}

export function AccountsEmpty() {
  return (
    <EmptyState
      title="No accounts connected yet"
      description="Add your first bank account, credit card, or cash wallet to monitor transactions and track net assets."
      action={{
        label: 'Add account',
        onSelect: () => openDialogParam('add', '1'),
      }}
    />
  );
}
