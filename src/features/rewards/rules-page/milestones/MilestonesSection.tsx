'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { useRewardAccountConfig } from '@/features/rewards/queries/useRewardAccountConfigQueries';
import { useDeleteRewardMilestone, useRewardMilestones } from '@/features/rewards/queries/useRewardMilestonesQueries';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategories } from '@/lib/query/hooks/useCategories';
import type { RewardMilestone } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

import type { MilestoneUsage } from '../rulesPageModel';
import { useRefreshUsage } from '../rulesRefresh';
import { milestoneDetail, milestoneSummary } from './milestoneModel';

const paidWhen = (m: RewardMilestone) =>
  m.payoutType === 'CASH_VALUE' && m.payoutTiming === 'WINDOW_END' ? 'received at window end' : null;

const loadMilestoneDialog = () => import('./MilestoneDialog').then((m) => m.MilestoneDialog);

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
  const { Component: MilestoneDialog, run: runMilestone } = useLazyDialog(loadMilestoneDialog);
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
      onError: (e) => dsRewardNotifier.failure(e, "Couldn't delete the milestone. Try again."),
    });
  };

  return (
    <Card
      title="Milestones"
      subtitle="Bonuses for hitting a spend threshold"
      action={
        <Text variant="label" as="div">
          <Button variant="link" size="sm" disabled={!accountId} onClick={() => void runMilestone(() => setOpen({ mode: 'new' }))}>
            Add milestone
          </Button>
        </Text>
      }
    >
      {milestones.length === 0 ? (
        <Card.Empty>
          No milestones yet. Use them for spend targets, transaction-count bonuses or annual-fee-waiver trackers.
        </Card.Empty>
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
            onClick={() => void runMilestone(() => setOpen({ mode: 'edit', id: m.id }))}
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

      {(open?.mode === 'new' || editing) && MilestoneDialog ? (
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
        description="The milestone goes. Your transactions and rewards stay. This can't be undone."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  );
}
