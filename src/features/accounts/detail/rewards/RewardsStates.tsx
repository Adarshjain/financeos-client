'use client';

import React from 'react';

import { Card, EmptyState } from '@/components/ds';
import { appHref } from '@/features/shell/routes';

export function RewardsEmpty({ accountId, accountName }: { accountId: string; accountName: string }) {
  return (
    <Card>
      <EmptyState
        title={`No reward rules on ${accountName} yet`}
        description="Rewards earned here show once a rule covers this account."
        action={{ label: 'Add reward rule', href: appHref(`/rewards/rules?account=${accountId}`) }}
      />
    </Card>
  );
}
