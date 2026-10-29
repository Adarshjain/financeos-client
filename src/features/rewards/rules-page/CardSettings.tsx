'use client';

import React from 'react';

import { Button, Card, Dialog, Select, showToast, Text, TextField } from '@/components/ds';
import { loadAccountForm } from '@/features/accounts/form/ds/AccountDialogs';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import { formatDate, formatMoney } from '@/lib/format';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { accountAnniversaryDate, type RewardType } from '@/lib/rewards.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import { useRewardAccountConfig, useUpdateRewardAccountConfig } from '../queries/useRewardAccountConfigQueries';
import { rewardTypeWord } from './rulesPageModel';
import { useRefreshUsage } from './rulesRefresh';

const FORM_ID = 'card-settings-form';

const REWARD_TYPE_OPTIONS = [
  { value: 'CASH', label: 'Cash ₹' },
  { value: 'POINTS', label: 'Reward points' },
];

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-space-4">
      <Text variant="overline" tone="ink-3" as="div">
        {label}
      </Text>
      <div className="flex flex-wrap items-center gap-space-8">{children}</div>
    </div>
  );
}

/** The Card settings card: what applies to every rule on the card. Reward type and point value change in a dialog; the anniversary is the account's own. */
export function CardSettings({ accountId }: { accountId: string }) {
  const config = useRewardAccountConfig(accountId).data;
  const account = useAccounts().data?.find((a) => a.id === accountId);
  const [editing, setEditing] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState(false);
  const accountForm = useLazyDialog(loadAccountForm);
  const anniversary = accountAnniversaryDate(account);
  const cash = (config?.defaultRewardType ?? 'CASH') === 'CASH';

  return (
    <Card
      title="Card settings"
      subtitle="Apply to every rule on this card"
      action={
        <Text variant="label" as="div">
          <Button variant="link" size="sm" disabled={!accountId} onClick={() => setEditing(true)}>
            Edit
          </Button>
        </Text>
      }
    >
      <div className="grid grid-cols-2 gap-x-space-16 gap-y-space-8 desk:gap-y-space-16 p-space-16 desk:grid-cols-3">
        <Fact label="Reward type">
          <Text variant="body-strong">{rewardTypeWord(config?.defaultRewardType)}</Text>
        </Fact>
        {cash ? null : (
          <Fact label="Point value">
            <Text variant="body-strong">
              {config?.pointValueInr != null ? `${formatMoney(config.pointValueInr, { decimals: 'unit' })}/pt` : 'Default (₹0.25/pt)'}
            </Text>
          </Fact>
        )}
        <Fact label="Anniversary">
          <Text variant="body-strong">{anniversary ? formatDate(anniversary, 'full') : 'Not set'}</Text>
          {account ? (
            <Text variant="label" as="div">
              <Button variant="link" size="sm" loading={accountForm.loading} onPointerDown={accountForm.preload} onClick={() => void accountForm.run(() => setEditingCard(true))}>
                Edit
              </Button>
            </Text>
          ) : null}
        </Fact>
      </div>
      {editing ? (
        <CardSettingsDialog
          key={accountId}
          accountId={accountId}
          rewardType={config?.defaultRewardType ?? 'CASH'}
          pointValue={config?.pointValueInr != null ? String(config.pointValueInr) : ''}
          onClose={() => setEditing(false)}
        />
      ) : null}
      {editingCard && account && accountForm.Component ? <accountForm.Component account={account} onClose={() => setEditingCard(false)} /> : null}
    </Card>
  );
}

interface CardSettingsDialogProps {
  accountId: string;
  rewardType: RewardType;
  pointValue: string;
  onClose: () => void;
}

/** Reward type and point value, saved together with the button (never as you type). */
export function CardSettingsDialog({ accountId, rewardType, pointValue, onClose }: CardSettingsDialogProps) {
  const update = useUpdateRewardAccountConfig();
  const refresh = useRefreshUsage();
  const [type, setType] = React.useState<RewardType>(rewardType);
  const [value, setValue] = React.useState(pointValue);

  const save = () => {
    const num = value.trim() ? parseFloat(value) : null;
    if (num != null && (Number.isNaN(num) || num <= 0)) {
      showToast('Enter a point value above ₹0.', { tone: 'danger' });
      return;
    }
    const typeChanged = type !== rewardType;
    const valueChanged = value.trim() !== pointValue.trim();
    update.mutate(
      { accountId, defaultRewardType: type, pointValueInr: num },
      {
        onSuccess: () => {
          showToast(
            typeChanged && !valueChanged
              ? type === 'POINTS'
                ? 'Card now defaults to reward points'
                : 'Card now defaults to cash'
              : !typeChanged && valueChanged
                ? num != null
                  ? `Point value set to ${formatMoney(num, { decimals: 'auto' })}/pt`
                  : 'Point value reset to default (₹0.25/pt)'
                : 'Card settings saved',
          );
          refresh();
          onClose();
        },
        onError: (e) => dsRewardNotifier.failure(e, "Couldn't update reward settings. Try again."),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title="Card settings"
        description="Apply to every rule on this card."
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: update.isPending }}
        primary={{ label: 'Save settings', type: 'submit', form: FORM_ID, loading: update.isPending }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            className="flex flex-col gap-space-8 desk:gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              if (!update.isPending) void save();
            }}
          >
            <Select
              label="Rewards paid as"
              options={REWARD_TYPE_OPTIONS}
              value={type}
              onValueChange={(v) => setType((Array.isArray(v) ? v[0] : v) as RewardType)}
            />
            {type === 'CASH' ? null : (
              <TextField
                label="Point value (₹/pt)"
                optional
                inputMode="decimal"
                placeholder="0.25 (default)"
                value={value}
                onValueChange={(v) => setValue(sanitizeDecimalInput(v))}
              />
            )}
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
