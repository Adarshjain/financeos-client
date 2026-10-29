'use client';

import React from 'react';

import { Button, Card, ConfirmDialog, ListRow, ProgressBar, showToast, Text } from '@/components/ds';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import type { RewardCapBucket } from '@/lib/rewards.types';

import { useDeleteRewardCapBucket, useRewardCapBuckets } from '../../queries/useRewardCapBucketsQueries';
import { useRewardRules } from '../../queries/useRewardRulesQueries';
import type { CapUsage } from '../rulesPageModel';
import { useRefreshUsage } from '../rulesRefresh';
import { CapDialog } from './CapDialog';
import { capSubtitle } from './capModel';

type Open = { mode: 'new' } | { mode: 'edit'; id: string } | null;

/** The Caps card of the Earning rules page: shared ceilings that rules draw from. */
export function CapsSection({ accountId, usage }: { accountId: string; usage?: Record<string, CapUsage> }) {
  const caps = useRewardCapBuckets(accountId).data ?? [];
  const rules = useRewardRules(accountId).data ?? [];
  const remove = useDeleteRewardCapBucket();
  const refresh = useRefreshUsage();
  const [open, setOpen] = React.useState<Open>(null);
  const [deleting, setDeleting] = React.useState<RewardCapBucket | null>(null);

  const editing = open?.mode === 'edit' ? caps.find((c) => c.id === open.id) : undefined;
  const usedByRules = (cap: RewardCapBucket) =>
    cap.ruleCount > 0 || rules.some((rule) => rule.capBucketId === cap.id);

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        showToast('Cap deleted');
        refresh();
        setDeleting(null);
        setOpen(null);
      },
      onError: (e) => dsRewardNotifier.failure(e, "Couldn't delete the cap. Try again."),
    });
  };

  return (
    <Card
      title="Caps"
      subtitle="Shared buckets rules can draw from"
      action={
        <Text variant="label" as="div">
          <Button variant="link" size="sm" disabled={!accountId} onClick={() => setOpen({ mode: 'new' })}>
            Add cap
          </Button>
        </Text>
      }
    >
      {caps.length === 0 ? (
        <Card.Empty>
          No shared caps. Use one when several rules must share a single ceiling, then pick it in each rule’s limits.
        </Card.Empty>
      ) : (
        caps.map((cap) => (
          <ListRow
            key={cap.id}
            clickable
            title={cap.name}
            subtitle={capSubtitle(cap, rules)}
            onClick={() => setOpen({ mode: 'edit', id: cap.id })}
            trailing={
              usage?.[cap.id] ? (
                <div className="flex w-space-96 max-w-full flex-col items-end gap-space-4 desk:w-container-xs">
                  <ProgressBar className="w-full" value={usage[cap.id].pct} tone={usage[cap.id].tone} />
                  <Text variant="caption" tone="ink-3">
                    {usage[cap.id].label}
                  </Text>
                </div>
              ) : undefined
            }
          />
        ))
      )}

      {open?.mode === 'new' || editing ? (
        <CapDialog
          key={editing?.id ?? 'new'}
          accountId={accountId}
          cap={editing}
          usedByRules={editing ? usedByRules(editing) : false}
          onClose={() => setOpen(null)}
          onDelete={editing ? () => setDeleting(editing) : undefined}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => (o ? undefined : setDeleting(null))}
        title={`Delete cap "${deleting?.name ?? ''}"?`}
        description={
          deleting && usedByRules(deleting)
            ? `${deleting.ruleCount || 'Some'} rule${deleting.ruleCount === 1 ? '' : 's'} still use this cap. Detach them first; the rules stay.`
            : "The cap goes. Your rules and rewards stay. This can't be undone."
        }
        confirmLabel="Delete cap"
        confirmDisabled={deleting ? usedByRules(deleting) : false}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  );
}
