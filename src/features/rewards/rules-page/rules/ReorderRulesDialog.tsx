'use client';

import React from 'react';

import { Dialog, ReorderList, showToast, Text } from '@/components/ds';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import type { RewardRule } from '@/lib/rewards.types';

import { useReorderRewardRules } from '../../queries/useRewardRulesQueries';
import { useRefreshUsage } from '../rulesRefresh';

export interface ReorderRulesDialogProps {
  accountId: string;
  /** The rules in their current order, first evaluated first. */
  rules: RewardRule[];
  onClose: () => void;
}

/** Re-ranks the card's rules with Move up and Move down; Save sends the new order, Cancel throws it away. */
export function ReorderRulesDialog({ accountId, rules, onClose }: ReorderRulesDialogProps) {
  const reorder = useReorderRewardRules();
  const refresh = useRefreshUsage();
  const [order, setOrder] = React.useState<string[]>(() => rules.map((r) => r.id));

  const save = () => {
    if (order.every((id, i) => id === rules[i]?.id)) {
      onClose();
      return;
    }
    reorder.mutate(
      { accountId, orderedIds: order },
      {
        onSuccess: () => {
          showToast('Rule order saved');
          refresh();
          onClose();
        },
        onError: (e) => dsRewardNotifier.failure(e, "Couldn't reorder reward rules. Try again."),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title="Reorder rules"
        description="The first rule that matches a transaction earns. Move a rule up to check it sooner."
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: reorder.isPending }}
        primary={{ label: 'Save order', onSelect: save, loading: reorder.isPending }}
      >
        <Dialog.Body>
          <ReorderList
            items={rules.map((r) => ({ id: r.id, title: r.name, ariaLabel: r.name }))}
            value={order}
            onValueChange={setOrder}
          />
          {rules.length < 2 ? (
            <Text variant="caption" tone="ink-3" as="p">
              Add a second rule to change the order.
            </Text>
          ) : null}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
