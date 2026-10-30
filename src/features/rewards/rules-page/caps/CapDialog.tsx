'use client';

import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Select } from '@/components/ds/Select/Select';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { useCreateRewardCapBucket, useUpdateRewardCapBucket } from '@/features/rewards/queries/useRewardCapBucketsQueries';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import type { CapWindow, CounterScope, RewardCapBucket, RewardType } from '@/lib/rewards.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import { useRefreshUsage } from '../rulesRefresh';
import { CAP_WINDOW_OPTIONS, COUNTER_SCOPE_OPTIONS, REWARD_TYPE_OPTIONS } from './capModel';

const FORM_ID = 'cap-form';

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
      showToast('Enter a cap name.', { tone: 'danger' });
      return;
    }
    if (!(Number(amount) > 0)) {
      showToast('Enter a cap above 0.', { tone: 'danger' });
      return;
    }
    const body = { accountId, name: name.trim(), cap: Number(amount), rewardType, windowType, counterScope };
    const onSuccess = () => {
      showToast(cap ? 'Cap updated' : 'Cap created');
      refresh();
      onClose();
    };
    const onError = (e: unknown) => dsRewardNotifier.failure(e, "Couldn't save the cap. Try again.");
    if (cap) update.mutate({ id: cap.id, body }, { onSuccess, onError });
    else create.mutate(body, { onSuccess, onError });
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title={cap ? `Edit cap · ${cap.name}` : 'Add cap'}
        tertiary={cap && onDelete ? { label: 'Delete', tone: 'danger', onSelect: onDelete, disabled: pending } : undefined}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: pending }}
        primary={{ label: cap ? 'Save cap' : 'Add cap', type: 'submit', form: FORM_ID, loading: pending }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            className="flex flex-col gap-space-8 desk:gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pending) void save();
            }}
          >
            <div className="grid grid-cols-1 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12 desk:grid-cols-2">
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
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
