'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Card, EmptyState } from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import { appHref } from '@/features/shell/routes';

export function RewardsEmpty({ accountId, accountName }: { accountId: string; accountName: string }) {
  const router = useRouter();
  return (
    <Card>
      <EmptyState
        title={`No reward rules on ${accountName} yet`}
        description="Rewards earned here show once a rule covers this account."
        action={{ label: 'Add reward rule', onSelect: () => router.push(appHref(`/rewards/rules?account=${accountId}`)) }}
      />
    </Card>
  );
}

export function RewardsLoadError({ what }: { what: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title={`Couldn't load ${what}`}
      description="Try again."
      action={{ label: 'Retry', onSelect: () => router.refresh() }}
    />
  );
}
