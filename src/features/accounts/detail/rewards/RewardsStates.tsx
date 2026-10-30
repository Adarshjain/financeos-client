'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
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
