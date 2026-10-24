'use client';

import React from 'react';

import { Dialog, DialogBody, DialogContent, Select, showToast, TextField } from '@/components/ds';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import type { CapWindow, CounterScope, RewardCapBucket, RewardType } from '@/lib/rewards.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import { useCreateRewardCapBucket, useUpdateRewardCapBucket } from '../../queries/useRewardCapBucketsQueries';
import { useRefreshUsage } from '../rulesRefresh';
import { CAP_WINDOW_OPTIONS, COUNTER_SCOPE_OPTIONS, REWARD_TYPE_OPTIONS } from './capModel';

export interface CapDialogProps {
  accountId: string;
  /** The cap being edited; undefined creates a new one. */
  cap?: RewardCapBucket;
  /** True when rules draw from this cap, which fixes its unit. */
  usedByRules: boolean;
  onClose: () => void;
  /** Edit only: asks the section to confirm deleting this cap. */
  onDelete?: () => void;
}

/** New / Edit cap: every field of a shared cap, opened from state. */
export function CapDialog({ accountId, cap, usedByRules, onClose, onDelete }: CapDialogProps) {
  const create = useCreateRewardCapBucket();
  const update = useUpdateRewardCapBucket();
  const refresh = useRefreshUsage();
  const [name, setName] = React.useState(cap?.name ?? '');
  const [amount, setAmount] = React.useState(cap ? String(cap.cap) : '');
  const [windowType, setWindowType] = React.useState<CapWindow>(cap?.windowType ?? 'CALENDAR_MONTH');
  const [rewardType, setRewardType] = React.useState<RewardType>(cap?.rewardType ?? 'CASH');
  const [counterScope, setCounterScope] = React.useState<CounterScope>(cap?.counterScope || 'ACCOUNT');
  const pending = create.isPending || update.isPending;

  const save = () => {
    if (!name.trim()) {
      showToast('Cap name is required.', { tone: 'danger' });
      return;
    }
    if (!(Number(amount) > 0)) {
      showToast('Cap must be a positive number.', { tone: 'danger' });
      return;
    }
    const body = { accountId, name: name.trim(), cap: Number(amount), rewardType, windowType, counterScope };
    const onSuccess = () => {
      showToast(cap ? 'Cap updated' : 'Cap created');
      refresh();
      onClose();
    };
    const onError = (e: unknown) => dsRewardNotifier.failure(e, 'Failed to save cap');
    if (cap) update.mutate({ id: cap.id, body }, { onSuccess, onError });
    else create.mutate(body, { onSuccess, onError });
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="md"
        title={cap ? `Edit cap · ${cap.name}` : 'New cap'}
        tertiary={cap && onDelete ? { label: 'Delete cap', tone: 'danger', onSelect: onDelete, disabled: pending } : undefined}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: pending }}
        primary={{ label: 'Save cap', onSelect: save, loading: pending }}
      >
        <DialogBody>
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
            <TextField
              className="desk:col-span-2"
              label="Name"
              placeholder="e.g. ACE combined cap"
              value={name}
              onValueChange={setName}
            />
            <TextField
              label={`Cap ${rewardType === 'POINTS' ? '(pts)' : '(₹)'}`}
              inputMode="decimal"
              placeholder="e.g. 500"
              value={amount}
              onValueChange={(v) => setAmount(sanitizeDecimalInput(v))}
            />
            <Select
              label="Window"
              options={CAP_WINDOW_OPTIONS}
              value={windowType}
              onValueChange={(v) => setWindowType(v as CapWindow)}
            />
            <Select
              label="Reward type"
              options={REWARD_TYPE_OPTIONS}
              value={rewardType}
              disabled={usedByRules}
              onValueChange={(v) => setRewardType(v as RewardType)}
              helper="The reward type is the cap’s unit — only rules paying that type can share this cap. It can’t be changed while rules still use the cap."
            />
            <Select
              label="Counter scope"
              options={COUNTER_SCOPE_OPTIONS}
              value={counterScope}
              onValueChange={(v) => setCounterScope(v as CounterScope)}
            />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
