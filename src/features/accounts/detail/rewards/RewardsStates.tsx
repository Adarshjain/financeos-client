'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Card, EmptyState } from '@/components/ds';
import { ErrorState } from '@/components/organisms';

export function RewardsEmpty({ accountId, accountName }: { accountId: string; accountName: string }) {
  const router = useRouter();
  return (
    <Card>
      <EmptyState
        title={`No reward rules on ${accountName}`}
        description="Rewards earned here show once a rule covers this account."
        action={{ label: 'Add reward rule', onSelect: () => router.push(`/rewards/rules?account=${accountId}`) }}
      />
    </Card>
  );
}

export function RewardsLoadError({ what }: { what: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title={`Could not load ${what}`}
      description="The rewards request failed. Try again."
      action={{ label: 'Try again', onSelect: () => router.refresh() }}
    />
  );
}
