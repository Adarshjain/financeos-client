'use client';

import React from 'react';

import { Button, Card, CardEmpty, ConfirmDialog, ListRow, ProgressBar, showToast, Text } from '@/components/ds';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategories } from '@/lib/query/hooks/useCategories';
import type { RewardMilestone } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

import { useRewardAccountConfig } from '../../queries/useRewardAccountConfigQueries';
import { useDeleteRewardMilestone, useRewardMilestones } from '../../queries/useRewardMilestonesQueries';
import type { MilestoneUsage } from '../rulesPageModel';
import { useRefreshUsage } from '../rulesRefresh';
import { MilestoneDialog } from './MilestoneDialog';
import { milestoneDetail, milestoneSummary } from './milestoneModel';

const paidWhen = (m: RewardMilestone) =>
  m.payoutType === 'CASH_VALUE' && m.payoutTiming === 'WINDOW_END' ? 'paid at window end' : null;

type Open = { mode: 'new' } | { mode: 'edit'; id: string } | null;

/** The Milestones card of the Earning rules page: bonuses for hitting a spend or transaction target. */
export function MilestonesSection({
  accountId,
  usage,
}: {
  accountId: string;
  usage?: Record<string, MilestoneUsage>;
}) {
  const milestones = useRewardMilestones(accountId).data ?? [];
  const account = useAccounts().data?.find((a) => a.id === accountId);
  const categories = useCategories().data ?? [];
  const defaultRewardType = useRewardAccountConfig(accountId).data?.defaultRewardType ?? 'CASH';
  const remove = useDeleteRewardMilestone();
  const refresh = useRefreshUsage();
  const [open, setOpen] = React.useState<Open>(null);
  const [deleting, setDeleting] = React.useState<RewardMilestone | null>(null);

  const editing = open?.mode === 'edit' ? milestones.find((m) => m.id === open.id) : undefined;
  const cardholders = account && 'cardholders' in account ? (account.cardholders ?? []) : [];

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        showToast('Milestone deleted');
        refresh();
        setDeleting(null);
        setOpen(null);
      },
      onError: (e) => dsRewardNotifier.failure(e, 'Failed to delete milestone'),
    });
  };

  return (
    <Card
      title="Milestones"
      subtitle="Bonuses for hitting a spend threshold"
      action={
        <Text variant="label" as="div">
          <Button variant="link" size="sm" disabled={!accountId} onClick={() => setOpen({ mode: 'new' })}>
            New milestone
          </Button>
        </Text>
      }
    >
      {milestones.length === 0 ? (
        <CardEmpty>
          No milestones yet. Use them for spend targets, transaction-count bonuses or annual-fee-waiver trackers.
        </CardEmpty>
      ) : (
        milestones.map((m) => (
          <ListRow
            key={m.id}
            clickable
            wrap
            title={m.name}
            subtitle={[milestoneSummary(m), milestoneDetail(m), usage?.[m.id]?.range, usage?.[m.id] ? paidWhen(m) : null]
              .filter(Boolean)
              .join(' · ')}
            onClick={() => setOpen({ mode: 'edit', id: m.id })}
          >
            {usage?.[m.id] ? (
              <div className="mt-space-8 flex w-full flex-col gap-space-4">
                <ProgressBar className="w-full" value={usage[m.id].pct} />
                <Text variant="caption" tone="ink-3">
                  {usage[m.id].label}
                </Text>
              </div>
            ) : null}
          </ListRow>
        ))
      )}

      {open?.mode === 'new' || editing ? (
        <MilestoneDialog
          key={editing?.id ?? 'new'}
          accountId={accountId}
          milestone={editing}
          cardholders={cardholders}
          isBank={account?.type === AccountType.BANK_ACCOUNT}
          categories={categories}
          defaultRewardType={defaultRewardType}
          onClose={() => setOpen(null)}
          onDelete={editing ? () => setDeleting(editing) : undefined}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => (o ? undefined : setDeleting(null))}
        title={`Delete milestone "${deleting?.name ?? ''}"?`}
        description="The milestone goes. Your transactions and rewards stay."
        confirmLabel="Delete milestone"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  );
}
