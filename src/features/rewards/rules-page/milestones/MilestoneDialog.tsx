'use client';

import React from 'react';

import { DateField, Dialog, DialogBody, DialogContent, SectionHeader, Select, Text, TextField } from '@/components/ds';
import { useRewardMilestoneForm } from '@/features/rewards/milestones/useRewardMilestoneForm';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import type { Cardholder } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import { todayInAppZone } from '@/lib/date-range';
import type {
  MilestoneBasis,
  MilestonePayoutTiming,
  MilestonePayoutType,
  MilestoneWindow,
  RewardMilestone,
  RewardType,
} from '@/lib/rewards.types';
import { parseCalendarDate, sanitizeDecimalInput, toCalendarDate } from '@/lib/utils';

import { useRefreshUsage } from '../rulesRefresh';
import {
  BASIS_OPTIONS,
  cardholderLabel,
  MILESTONE_WINDOW_OPTIONS,
  offerWindowFor,
  PAID_AS_OPTIONS,
  PAYOUT_TIMING_OPTIONS,
  PAYOUT_TYPE_OPTIONS,
} from './milestoneModel';

export interface MilestoneDialogProps {
  accountId: string;
  /** The milestone being edited; undefined creates a new one. */
  milestone?: RewardMilestone;
  cardholders: Cardholder[];
  isBank: boolean;
  categories: Category[];
  /** The card's default reward currency, preselected for new milestones. */
  defaultRewardType: RewardType;
  onClose: () => void;
  /** Edit only: asks the section to confirm deleting this milestone. */
  onDelete?: () => void;
}

const ALL_HOLDERS = 'ALL';

/** New / Edit milestone: every field of a milestone, opened from state. The form logic is the shared milestone form hook. */
export function MilestoneDialog({
  accountId,
  milestone,
  cardholders,
  isBank,
  categories,
  defaultRewardType,
  onClose,
  onDelete,
}: MilestoneDialogProps) {
  const refresh = useRefreshUsage();
  const f = useRewardMilestoneForm({
    accountId,
    categories,
    defaultRewardType,
    milestone,
    onSaved: () => {
      refresh();
      onClose();
    },
    notify: dsRewardNotifier,
  });
  const pending = f.isSubmitting;
  const oneTime = f.windowType === 'ONE_TIME';
  const iso = (d: Date | undefined) => (d ? toCalendarDate(d) : '');
  const pickDate = (set: (d?: Date) => void) => (v: string | { start?: string; end?: string }) =>
    set(typeof v === 'string' && v ? parseCalendarDate(v) : undefined);

  const categoryOptions = React.useMemo(() => {
    const known = new Set(categories.map((c) => c.id));
    const missing = [...f.includeCategories, ...f.excludeCategories].filter((c) => !known.has(c.id));
    return [...categories, ...missing].map((c) => ({ value: c.id, label: c.name }));
  }, [categories, f.includeCategories, f.excludeCategories]);
  const toCategories = (ids: string[]): Category[] =>
    ids.map((id) => [...categories, ...f.includeCategories, ...f.excludeCategories].find((c) => c.id === id) ?? ({ id, name: 'Unknown category' } as Category));

  const holderOptions = React.useMemo(
    () => [
      { value: ALL_HOLDERS, label: 'All cardholders (account-level)' },
      ...cardholders.map((c) => ({ value: c.id, label: cardholderLabel(c, isBank) })),
    ],
    [cardholders, isBank],
  );

  const pickHolder = (value: string) => {
    const next = value === ALL_HOLDERS ? null : value;
    f.setCardId(next);
    if (next && oneTime) {
      const window = offerWindowFor(cardholders.find((c) => c.id === next)!);
      if (window) {
        f.setActiveFrom(parseCalendarDate(window.from));
        f.setActiveTo(parseCalendarDate(window.to));
      }
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="lg"
        title={milestone ? `Edit milestone · ${milestone.name}` : 'New milestone'}
        tertiary={
          milestone && onDelete ? { label: 'Delete milestone', tone: 'danger', onSelect: onDelete, disabled: pending } : undefined
        }
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: pending }}
        primary={{ label: 'Save milestone', onSelect: f.onSubmit, loading: pending }}
      >
        <DialogBody>
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
            <TextField label="Name" placeholder="e.g. ₹50k quarterly voucher" value={f.name} onValueChange={f.setName} />
            <Select
              label="Window"
              options={MILESTONE_WINDOW_OPTIONS}
              value={f.windowType}
              onValueChange={(v) => f.setWindowType(v as MilestoneWindow)}
            />
            {cardholders.length > 0 ? (
              <Select
                className="desk:col-span-2"
                label="Cardholder scope"
                options={holderOptions}
                value={f.cardId ?? ALL_HOLDERS}
                onValueChange={(v) => pickHolder(v as string)}
              />
            ) : null}
            <DateField
              label={oneTime ? 'Offer start' : 'Active from'}
              optional={!oneTime}
              today={todayInAppZone()}
              value={iso(f.activeFrom)}
              onValueChange={pickDate(f.setActiveFrom)}
            />
            <DateField
              label={oneTime ? 'Offer deadline' : 'Active until'}
              optional={!oneTime}
              today={todayInAppZone()}
              value={iso(f.activeTo)}
              onValueChange={pickDate(f.setActiveTo)}
            />
            {oneTime ? (
              <Text variant="caption" tone="ink-3" as="p" className="desk:col-span-2">
                The offer period IS the one-time window — spend counts from start until the day before the deadline.
              </Text>
            ) : null}
            <Select
              label="Counts"
              options={BASIS_OPTIONS}
              value={f.basis}
              onValueChange={(v) => f.setBasis(v as MilestoneBasis)}
            />
            <TextField
              label={`Threshold ${f.basis === 'SPEND' ? '₹' : '(txns)'}`}
              inputMode="decimal"
              placeholder={f.basis === 'SPEND' ? 'e.g. 50000' : 'e.g. 4'}
              value={f.threshold}
              onValueChange={(v) => f.setThreshold(sanitizeDecimalInput(v))}
            />
            {f.basis === 'TXN_COUNT' ? (
              <TextField
                label="Min txn amount ₹"
                optional
                inputMode="decimal"
                placeholder="e.g. 1500"
                value={f.minTxnAmount}
                onValueChange={(v) => f.setMinTxnAmount(sanitizeDecimalInput(v))}
              />
            ) : null}
            <Select
              label="Payout"
              options={PAYOUT_TYPE_OPTIONS}
              value={f.payoutType}
              onValueChange={(v) => f.setPayoutType(v as MilestonePayoutType)}
            />
            {f.payoutType === 'CASH_VALUE' ? (
              <>
                <Select
                  label="Paid as"
                  options={PAID_AS_OPTIONS}
                  value={f.rewardType}
                  onValueChange={(v) => f.setRewardType(v as RewardType)}
                />
                <TextField
                  label={`Payout value ${f.rewardType === 'POINTS' ? '(pts)' : '₹'}`}
                  inputMode="decimal"
                  placeholder="e.g. 1000"
                  value={f.payoutValue}
                  onValueChange={(v) => f.setPayoutValue(sanitizeDecimalInput(v))}
                />
                <Select
                  label="Credited"
                  options={PAYOUT_TIMING_OPTIONS}
                  value={f.payoutTiming}
                  onValueChange={(v) => f.setPayoutTiming(v as MilestonePayoutTiming)}
                />
              </>
            ) : null}
          </div>
          <SectionHeader variant="band">
            Eligible spend — independent from earn rules; leave empty to count everything
          </SectionHeader>
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
            <Select
              label="Count only these categories"
              multiple
              searchable
              options={categoryOptions}
              value={f.includeCategories.map((c) => c.id)}
              onValueChange={(v) => f.setIncludeCategories(toCategories(v as string[]))}
            />
            <TextField
              label="Count only these MCCs"
              placeholder="Comma-separated, e.g. 5812, 5814"
              value={f.includeMccs}
              onValueChange={f.setIncludeMccs}
            />
            <Select
              label="Never count these categories"
              multiple
              searchable
              options={categoryOptions}
              value={f.excludeCategories.map((c) => c.id)}
              onValueChange={(v) => f.setExcludeCategories(toCategories(v as string[]))}
            />
            <TextField
              label="Never count these MCCs"
              placeholder="e.g. 6513, 6540 (rent, wallet)"
              value={f.excludeMccs}
              onValueChange={f.setExcludeMccs}
            />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
