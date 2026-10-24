'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { useRewardAccountConfig } from '@/features/rewards/queries/useRewardAccountConfigQueries';
import { useRewardCapBuckets } from '@/features/rewards/queries/useRewardCapBucketsQueries';
import { RuleDialog } from '@/features/rewards/rules-page/rules/RuleDialog';
import { RulesRefreshProvider } from '@/features/rewards/rules-page/rulesRefresh';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategories } from '@/lib/query/hooks/useCategories';
import type { RewardRule } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

/**
 * The Earning rules page's rule dialog, opened in place (Edit) on a card's rewards page. It loads its own lookups
 * (categories, cap buckets, cardholders) only once it is open. A save re-reads this page's server data.
 */
export function RuleEditor({
  accountId,
  rule,
  rules,
  onClose,
}: {
  accountId: string;
  rule: RewardRule;
  /** Every rule of the account: the dialog's default priority sits above all of them. */
  rules: readonly RewardRule[];
  /** No longer read (End & clone left the dialog); callers still pass it. */
  today?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const refresh = React.useCallback(() => router.refresh(), [router]);
  const categories = useCategories().data ?? [];
  const bucketsQuery = useRewardCapBuckets(accountId);
  const capBuckets = bucketsQuery.data ?? [];
  const account = useAccounts().data?.find((a) => a.id === accountId);
  const defaultRewardType = useRewardAccountConfig(accountId).data?.defaultRewardType ?? 'CASH';
  const cardholders = account && 'cardholders' in account ? (account.cardholders ?? []) : [];

  return (
    <RulesRefreshProvider value={refresh}>
      <RuleDialog
        accountId={accountId}
        rule={rule}
        categories={categories}
        capBuckets={capBuckets}
        capBucketsLoading={bucketsQuery.isLoading}
        cardholders={cardholders}
        isBank={account?.type === AccountType.BANK_ACCOUNT}
        defaultRewardType={defaultRewardType}
        defaultPriority={(rules.length ? Math.max(...rules.map((r) => r.priority)) : 0) + 1}
        onClose={onClose}
      />
    </RulesRefreshProvider>
  );
}
