'use client';

import React from 'react';

import {
  Button,
  Checkbox,
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  Reveal,
  SectionHeader,
  SegmentedControl,
  Select,
  Text,
  TextField,
} from '@/components/ds';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import {
  CAP_WINDOW_LABELS,
  CHANNEL_OPTIONS,
  DAY_OPTIONS,
  MERCHANT_MATCH_LABELS,
} from '@/features/rewards/rules/form/constants';
import { useRewardRuleForm } from '@/features/rewards/rules/form/useRewardRuleForm';
import type { Cardholder } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import { todayInAppZone } from '@/lib/date-range';
import type {
  AccrualType,
  CapExhaustedBehavior,
  CapWindow,
  CashbackRounding,
  CounterScope,
  DayOfWeek,
  EmiTreatment,
  FeeTreatment,
  IntlTreatment,
  RewardCapBucket,
  RewardMerchantMatch,
  RewardRule,
  RewardType,
  RuleStacking,
} from '@/lib/rewards.types';
import type { TransactionChannel } from '@/lib/transaction.types';
import { parseCalendarDate, sanitizeDecimalInput, toCalendarDate } from '@/lib/utils';

import { cardholderLabel } from '../milestones/milestoneModel';
import { useRefreshUsage } from '../rulesRefresh';
import { RuleTester } from './RuleTester';

/** The subtitle of every rule dialog, as the owner worded it. */
export const RULE_DIALOG_SUBTITLE = 'Changes apply to every transaction on this card. To change a rate from a date, use End & clone.';

export interface RuleDialogProps {
  accountId: string;
  /** The rule being edited. */
  rule?: RewardRule;
  /** A new rule prefilled from this one (Clone, End & clone). */
  cloneFrom?: RewardRule;
  categories: Category[];
  capBuckets: RewardCapBucket[];
  cardholders: Cardholder[];
  isBank: boolean;
  defaultRewardType: RewardType;
  /** The priority a new rule takes: above every rule on the card. */
  defaultPriority: number;
  onClose: () => void;
  /** Edit only: asks the section to confirm deleting this rule. */
  onDelete?: () => void;
}

const ALL = 'ALL';
const NONE = 'NONE';
const asList = (v: string | string[]): string[] => (Array.isArray(v) ? v : v ? [v] : []);
const first = (v: string | string[]): string => asList(v)[0] ?? '';

const REWARD_TYPE_OPTIONS = [
  { value: 'CASH', label: 'Cash ₹' },
  { value: 'POINTS', label: 'Reward points' },
];
const ACCRUAL_OPTIONS = [
  { value: 'PERCENT', label: '% of spend' },
  { value: 'SLAB', label: 'Per slab' },
];
const STACKING_OPTIONS = [
  { value: 'EXCLUSIVE', label: 'Exclusive (first match wins)' },
  { value: 'ADDITIVE', label: 'Additive (bonus on top)' },
];
const COUNTER_OPTIONS = [
  { value: 'ACCOUNT', label: 'Account-wide counter' },
  { value: 'PER_CARDHOLDER', label: 'Per-cardholder counter' },
];
const MATCH_OPTIONS = [
  { value: NONE, label: '—' },
  ...(Object.keys(MERCHANT_MATCH_LABELS) as RewardMerchantMatch[]).map((value) => ({ value, label: MERCHANT_MATCH_LABELS[value] })),
];
const EMI_OPTIONS = [
  { value: 'INCLUDE', label: 'Include' },
  { value: 'EXCLUDE_EMI', label: 'Exclude EMI' },
  { value: 'ONLY_EMI', label: 'Only EMI' },
];
const INTL_OPTIONS = [
  { value: 'INCLUDE', label: 'Include' },
  { value: 'EXCLUDE_INTL', label: 'Exclude international' },
  { value: 'ONLY_INTL', label: 'Only international' },
];
const FEE_OPTIONS = [
  { value: 'INCLUDE', label: 'Earns like the rest of the spend' },
  { value: 'EXCLUDE_FEE', label: 'Netted out of the basis' },
];
const CAP_WINDOW_OPTIONS = (Object.keys(CAP_WINDOW_LABELS) as CapWindow[]).map((value) => ({ value, label: CAP_WINDOW_LABELS[value] }));
const CAP_EXHAUSTED_OPTIONS = [
  { value: 'FALL_THROUGH', label: 'Fall through to next rule' },
  { value: 'STOP', label: 'Stop (earn nothing)' },
];
const PRECISION_OPTIONS = (points: boolean) => [
  { value: '0', label: points ? 'Whole points' : 'Whole rupees' },
  { value: '1', label: '1 decimal' },
  { value: '2', label: '2 decimals' },
];
const ROUNDING_OPTIONS = (points: boolean) => [
  { value: 'NONE', label: points ? 'Keep decimals' : 'Keep paise' },
  { value: 'FLOOR_RUPEE', label: points ? 'Floor to whole point' : 'Floor to rupee' },
  { value: 'NEAREST_RUPEE', label: points ? 'Nearest whole point' : 'Nearest rupee' },
];

/** New / Edit rule: every field of a reward rule, opened from state. The rarer fields sit in a fold so the dialog opens short. */
export function RuleDialog({
  accountId,
  rule,
  cloneFrom,
  categories,
  capBuckets,
  cardholders,
  isBank,
  defaultRewardType,
  defaultPriority,
  onClose,
  onDelete,
}: RuleDialogProps) {
  const refresh = useRefreshUsage();
  const f = useRewardRuleForm({
    accountId,
    categories,
    capBuckets,
    defaultRewardType,
    rule,
    cloneFrom,
    defaultPriority,
    onSaved: () => {
      refresh();
      onClose();
    },
    notify: dsRewardNotifier,
  });
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [testOpen, setTestOpen] = React.useState(false);
  const today = todayInAppZone();
  const points = f.rewardType === 'POINTS';
  const unit = points ? '(pts)' : '(₹)';
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const iso = (d: Date | undefined) => (d ? toCalendarDate(d) : '');
  const pickDate = (set: (d?: Date) => void) => (v: string | { start?: string; end?: string }) =>
    set(typeof v === 'string' && v ? parseCalendarDate(v) : undefined);
  const setTier = (index: number, patch: Partial<{ upTo: string; rate: string }>) =>
    f.setTierRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const bucketOptions = capBuckets.map((b) => ({
    value: b.id,
    label: `${b.name} — ${b.cap} ${b.rewardType === 'POINTS' ? 'pts' : '₹'} / ${CAP_WINDOW_LABELS[b.windowType].toLowerCase()}`,
    disabled: b.rewardType !== f.rewardType,
  }));

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="lg"
        title={rule ? 'Edit rule' : 'New rule'}
        description={RULE_DIALOG_SUBTITLE}
        tertiary={rule && onDelete ? { label: 'Delete rule', tone: 'danger', onSelect: onDelete, disabled: f.isSubmitting } : undefined}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: f.isSubmitting }}
        primary={{ label: 'Save & recompute', onSelect: f.onSubmit, loading: f.isSubmitting }}
      >
        <DialogBody>
          <TextField label="Name" placeholder="e.g. 5% online" value={f.name} onValueChange={f.setName} />

          <SectionHeader variant="band">Earns</SectionHeader>
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
            <Select
              label="Rewards paid as"
              options={REWARD_TYPE_OPTIONS}
              value={f.rewardType}
              onValueChange={(v) => f.setRewardType(first(v) as RewardType)}
            />
            <SegmentedControl
              size="lg"
              options={ACCRUAL_OPTIONS}
              value={f.accrualType}
              onValueChange={(v) => f.setAccrualType(v as AccrualType)}
              aria-label="How it accrues"
            />
            {f.accrualType === 'PERCENT' ? (
              f.isTiered ? null : (
                <TextField
                  label="Rate %"
                  inputMode="decimal"
                  placeholder="e.g. 5"
                  value={f.percentRate}
                  onValueChange={(v) => f.setPercentRate(sanitizeDecimalInput(v))}
                />
              )
            ) : (
              <>
                <TextField
                  label="Slab size ₹"
                  inputMode="decimal"
                  placeholder="e.g. 150"
                  value={f.slabSize}
                  onValueChange={(v) => f.setSlabSize(sanitizeDecimalInput(v))}
                />
                {f.isTiered ? null : (
                  <TextField
                    label={points ? 'Points per slab' : '₹ per slab'}
                    inputMode="decimal"
                    placeholder="e.g. 5"
                    value={f.pointsPerSlab}
                    onValueChange={(v) => f.setPointsPerSlab(sanitizeDecimalInput(v))}
                  />
                )}
              </>
            )}
          </div>

          <SectionHeader variant="band">Applies when any of</SectionHeader>
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
            <Select
              label="Categories"
              multiple
              searchable
              placeholder="Any"
              options={categoryOptions}
              value={f.selectedCategories.map((c) => c.id)}
              onValueChange={(v) =>
                f.setSelectedCategories(asList(v).flatMap((id) => categories.find((c) => c.id === id) ?? []))
              }
            />
            <TextField
              label="MCC codes"
              placeholder="Comma-separated, e.g. 5812, 5814"
              value={f.mccText}
              onValueChange={f.setMccText}
            />
          </div>
          <Text variant="caption" tone="ink-3" as="p">
            Leave everything empty to match all spends.
          </Text>

          <SectionHeader variant="band">And also</SectionHeader>
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
            <TextField
              label="Merchant pattern"
              optional
              placeholder="e.g. swiggy"
              value={f.merchantPattern}
              onValueChange={f.setMerchantPattern}
            />
            <Select
              label="Match type"
              options={MATCH_OPTIONS}
              value={f.merchantMatch}
              onValueChange={(v) => f.setMerchantMatch((first(v) || NONE) as RewardMerchantMatch | 'NONE')}
            />
            <Select
              className="desk:col-span-2"
              label="Channels"
              multiple
              placeholder="Any"
              options={CHANNEL_OPTIONS}
              value={f.channels}
              onValueChange={(v) => f.setChannels(asList(v) as TransactionChannel[])}
            />
          </div>

          <SectionHeader variant="band">Limits</SectionHeader>
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
            <Select
              label="Period cap"
              options={[
                { value: 'NONE', label: 'No period cap' },
                { value: 'OWN', label: 'This rule’s own cap' },
                { value: 'BUCKET', label: `Shared bucket${capBuckets.length === 0 ? ' (none yet)' : ''}`, disabled: capBuckets.length === 0 },
              ]}
              value={f.capMode}
              onValueChange={(v) => f.setCapMode(first(v) as 'NONE' | 'OWN' | 'BUCKET')}
            />
            {f.capMode === 'OWN' ? (
              <>
                <TextField
                  label={`Cap ${unit}`}
                  inputMode="decimal"
                  placeholder="e.g. 500"
                  value={f.periodCap}
                  onValueChange={(v) => f.setPeriodCap(sanitizeDecimalInput(v))}
                />
                <Select
                  label="Cap window"
                  options={CAP_WINDOW_OPTIONS}
                  value={f.capWindow}
                  onValueChange={(v) => f.setCapWindow(first(v) as CapWindow)}
                />
              </>
            ) : null}
            {f.capMode === 'BUCKET' ? (
              <Select
                label="Shared bucket"
                placeholder="Pick a bucket"
                options={bucketOptions}
                value={f.capBucketId}
                onValueChange={(v) => f.setCapBucketId(first(v))}
                helper="Several rules can drain one bucket’s ceiling together. A bucket only takes rules of its own reward type."
              />
            ) : null}
            {f.capMode !== 'NONE' ? (
              <Select
                label="When cap is hit"
                options={CAP_EXHAUSTED_OPTIONS}
                value={f.onCapExhausted}
                onValueChange={(v) => f.setOnCapExhausted(first(v) as CapExhaustedBehavior)}
              />
            ) : null}
          </div>

          <SectionHeader variant="band">Active</SectionHeader>
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
            <DateField
              label="From"
              optional
              placeholder="Always"
              today={today}
              value={iso(f.activeFrom)}
              onValueChange={pickDate(f.setActiveFrom)}
            />
            <DateField
              label="Until"
              optional
              placeholder="Open-ended"
              today={today}
              value={iso(f.activeTo)}
              onValueChange={pickDate(f.setActiveTo)}
            />
          </div>

          <div>
            <Button type="button" variant="link" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
              Advanced options
            </Button>
          </div>
          <Reveal open={moreOpen}>
            <div className="flex flex-col gap-space-12">
              <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
                <Select
                  label="Stacking"
                  options={STACKING_OPTIONS}
                  value={f.stacking}
                  onValueChange={(v) => f.setStacking(first(v) as RuleStacking)}
                />
                {cardholders.length > 0 ? (
                  <>
                    <Select
                      label="Cardholder scope"
                      options={[
                        { value: ALL, label: 'All cardholders (account-level)' },
                        ...cardholders.map((c) => ({ value: c.id, label: cardholderLabel(c, isBank) })),
                      ]}
                      value={f.cardId ?? ALL}
                      onValueChange={(v) => f.setCardId(first(v) === ALL ? null : first(v))}
                    />
                    <Select
                      label="Counter scope"
                      options={COUNTER_OPTIONS}
                      value={f.counterScope}
                      onValueChange={(v) => f.setCounterScope(first(v) as CounterScope)}
                    />
                  </>
                ) : null}
                {f.accrualType === 'PERCENT' ? (
                  <Select
                    label="Rounding"
                    options={ROUNDING_OPTIONS(points)}
                    value={f.rounding}
                    onValueChange={(v) => f.setRounding(first(v) as CashbackRounding)}
                  />
                ) : (
                  <Select
                    label={points ? 'Point precision' : 'Value precision'}
                    options={PRECISION_OPTIONS(points)}
                    value={f.pointPrecision}
                    onValueChange={(v) => f.setPointPrecision(first(v))}
                  />
                )}
                <Select
                  label="Days of week"
                  multiple
                  placeholder="Any"
                  options={DAY_OPTIONS}
                  value={f.daysOfWeek}
                  onValueChange={(v) => f.setDaysOfWeek(asList(v) as DayOfWeek[])}
                />
                <TextField
                  label="Min amount"
                  optional
                  inputMode="decimal"
                  placeholder="₹"
                  value={f.minAmount}
                  onValueChange={(v) => f.setMinAmount(sanitizeDecimalInput(v))}
                />
                <TextField
                  label="Max amount"
                  optional
                  inputMode="decimal"
                  placeholder="₹"
                  value={f.maxAmount}
                  onValueChange={(v) => f.setMaxAmount(sanitizeDecimalInput(v))}
                />
                <Select
                  label="EMI spends"
                  options={EMI_OPTIONS}
                  value={f.emiTreatment}
                  onValueChange={(v) => f.setEmiTreatment(first(v) as EmiTreatment)}
                />
                <Select
                  label="International"
                  options={INTL_OPTIONS}
                  value={f.intlTreatment}
                  onValueChange={(v) => f.setIntlTreatment(first(v) as IntlTreatment)}
                />
                <Select
                  label="Convenience fee"
                  options={FEE_OPTIONS}
                  value={f.feeTreatment}
                  onValueChange={(v) => f.setFeeTreatment(first(v) as FeeTreatment)}
                  helper="Most issuers post the surcharge to the card but award nothing on it."
                />
                <TextField
                  label={`Per-transaction cap ${unit}`}
                  optional
                  inputMode="decimal"
                  placeholder="No cap"
                  value={f.perTxnCap}
                  onValueChange={(v) => f.setPerTxnCap(sanitizeDecimalInput(v))}
                />
              </div>

              <label className="flex items-center gap-space-8">
                <Checkbox checked={f.isTiered} onCheckedChange={(c) => f.setIsTiered(c === true)} />
                <Text variant="body">Tiered rate</Text>
              </label>
              <Text variant="caption" tone="ink-3" as="p">
                Rate steps as matched spend grows in a window (e.g. 10X above ₹20k/cycle).
              </Text>
              {f.isTiered ? (
                <div className="flex flex-col gap-space-12">
                  <Select
                    label="Spend window"
                    options={CAP_WINDOW_OPTIONS}
                    value={f.tierWindow}
                    onValueChange={(v) => f.setTierWindow(first(v) as CapWindow)}
                  />
                  {f.tierRows.map((tier, index) => {
                    const last = index === f.tierRows.length - 1;
                    return (
                      <div key={index} className="grid grid-cols-1 items-end gap-space-12 desk:grid-cols-[1fr_1fr_auto]">
                        {last ? (
                          <Text variant="body-strong" tone="ink-3" as="div">
                            {index === 0 ? 'First' : 'Above'} · everything beyond
                          </Text>
                        ) : (
                          <TextField
                            label={index === 0 ? 'First, up to ₹' : 'Then, up to ₹'}
                            inputMode="decimal"
                            placeholder="up to ₹"
                            value={tier.upTo}
                            onValueChange={(v) => setTier(index, { upTo: sanitizeDecimalInput(v) })}
                          />
                        )}
                        <TextField
                          label={f.accrualType === 'PERCENT' ? 'Rate %' : points ? 'Points per slab' : '₹ per slab'}
                          inputMode="decimal"
                          value={tier.rate}
                          onValueChange={(v) => setTier(index, { rate: sanitizeDecimalInput(v) })}
                        />
                        {!last && f.tierRows.length > 2 ? (
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => f.setTierRows((rows) => rows.filter((_, i) => i !== index))}
                          >
                            Remove tier
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                  <div>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() =>
                        f.setTierRows((rows) => [...rows.slice(0, -1), { upTo: '', rate: '' }, rows[rows.length - 1]])
                      }
                    >
                      Add tier
                    </Button>
                  </div>
                </div>
              ) : null}
              {points ? (
                <Text variant="caption" tone="ink-3" as="p">
                  Points are tracked as points — the report doesn’t convert them to a cash value.
                </Text>
              ) : null}
            </div>
          </Reveal>

          <div>
            <Button type="button" variant="link" onClick={() => setTestOpen((o) => !o)} aria-expanded={testOpen}>
              Test this rule
            </Button>
          </div>
          <Reveal open={testOpen}>
            <RuleTester f={f} categories={categories} />
          </Reveal>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
