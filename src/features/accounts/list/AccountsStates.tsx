'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { EmptyState } from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import { useAccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';

export function AccountsLoadError({ reference }: { reference?: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title="Couldn't load accounts"
      description="Try again. If it keeps failing, quote the reference."
      action={{ label: 'Retry', onSelect: () => router.refresh() }}
      reference={reference}
    />
  );
}

export function AccountsEmpty() {
  const { open } = useAccountDialogs();
  return (
    <EmptyState
      title="No accounts connected yet"
      description="Add your first bank account, credit card, or cash wallet to monitor transactions and track net assets."
      action={{
        label: 'Add account',
        onSelect: () => open(),
      }}
    />
  );
}
