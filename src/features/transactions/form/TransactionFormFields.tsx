'use client';

import React from 'react';

import {
  DateField,
  EmptyState,
  SectionHeader,
  SegmentedControl,
  Select,
  type SelectOption,
  TextArea,
  TextField,
} from '@/components/ds';
import { AmountField, SettingsToggle } from '@/components/organisms';
import { amountExpressionProps } from '@/lib/amountExpression';
import type { Category } from '@/lib/categories.types';
import type { ReviewType, TransactionChannel } from '@/lib/transaction.types';

import { CategoriesField } from './CategoriesField';
import { CHANNEL_LABELS } from './constants';
import {
  type Direction,
  EDITABLE_REASONS,
  type FormErrors,
  NO_CARD,
  NO_CHANNEL,
  type TransactionFormValues,
} from './transactionFormModel';

const DIRECTIONS = [
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
];

const REVIEW_OPTIONS = (isUpdate: boolean): SelectOption[] => [
  { value: 'NEEDS_REVIEW', label: 'Needs review' },
  {
    value: 'AUTO_REVIEWED',
    label: 'Auto reviewed',
    // Only the app marks a transaction auto reviewed; a person cannot choose it on Edit.
    disabled: isUpdate,
    disabledReason: isUpdate ? 'Set by imports and rules' : undefined,
  },
  { value: 'MANUALLY_REVIEWED', label: 'Manually reviewed' },
  { value: 'NA', label: 'Not applicable' },
];

const REASON_OPTIONS: SelectOption[] = EDITABLE_REASONS.map((r) => ({
  value: r,
  label: { UNRECONCILED: 'Unreconciled', CATEGORY_UNVERIFIED: 'Category unverified', DUPLICATE_SUSPECT: 'Duplicate', DATE_CORRECTED: 'Date corrected' }[r],
}));

const CHANNEL_OPTIONS: SelectOption[] = [
  { value: NO_CHANNEL, label: 'Not set' },
  ...(Object.keys(CHANNEL_LABELS) as TransactionChannel[]).map((c) => ({ value: c, label: CHANNEL_LABELS[c] })),
];

/** Two fields side by side on every width; `stack` lets them stack on phone instead. */
function Pair({ children, stack = false }: { children: React.ReactNode; stack?: boolean }) {
  return <div className={stack ? 'grid grid-cols-1 desk:grid-cols-2 gap-space-12' : 'grid grid-cols-2 gap-space-12'}>{children}</div>;
}

export interface TransactionFormFieldsProps {
  values: TransactionFormValues;
  errors: FormErrors;
  isUpdate: boolean;
  today: string;
  accountOptions: SelectOption[];
  /** The accounts to record against: none shows the "no account yet" state in place of the Account field. */
  hasAccounts: boolean;
  cardOptions: { id: string; label: string }[];
  categories: Category[];
  selectedCategoryIds: string[];
  creatingCategory: boolean;
  suggestingCategories: boolean;
  /** The raw bank text, shown under the description on Edit. */
  sourcedDescription?: string | null;
  /** Shown on the Review status field while Needs review has no reason. */
  reviewError?: string;
  onChange: (patch: Partial<TransactionFormValues>) => void;
  onAccountChange: (accountId: string) => void;
  onCategoriesChange: (ids: string[]) => void;
  onCreateCategory: (name: string) => void;
  onDescriptionBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onAddAccount: () => void;
}

/** The fields of Add transaction and Edit transaction: one form for both. */
export function TransactionFormFields({
  values,
  errors,
  isUpdate,
  today,
  accountOptions,
  hasAccounts,
  cardOptions,
  categories,
  selectedCategoryIds,
  creatingCategory,
  suggestingCategories,
  sourcedDescription,
  reviewError,
  onChange,
  onAccountChange,
  onCategoriesChange,
  onCreateCategory,
  onDescriptionBlur,
  onAddAccount,
}: TransactionFormFieldsProps) {
  const noAccountYet = !isUpdate && !hasAccounts;
  const descriptionHelper = isUpdate
    ? (sourcedDescription ?? undefined)
    : suggestingCategories
      ? 'Suggesting categories…'
      : 'Rules and the categoriser suggest a category as you type';

  return (
    <>
      <div className="flex items-start gap-space-8">
        <SegmentedControl
          aria-label="Debit or credit"
          options={DIRECTIONS}
          size="xl"
          value={values.direction}
          onValueChange={(direction) => onChange({ direction: direction as Direction })}
        />
        <AmountField
          aria-label="Amount"
          className="min-w-0 flex-1"
          tone={values.direction === 'credit' ? 'success' : 'neutral'}
          size="xl"
          align="right"
          prefix="₹"
          inputMode="decimal"
          placeholder="0.00"
          value={values.amount}
          {...amountExpressionProps(values.amount, (v) => onChange({ amount: v }))}
          onNegative={() => onChange({ direction: 'debit' })}
          error={errors.amount}
        />
      </div>

      <div className="grid grid-cols-5 gap-space-12">
        <DateField
          label="Date"
          today={today}
          value={values.date}
          onValueChange={(v) => onChange({ date: typeof v === 'string' ? v : '' })}
          error={errors.date}
          className={noAccountYet ? 'col-span-5' : 'col-span-2'}
        />
        {noAccountYet ? null : (
          <Select
            className="col-span-3"
            label="Account"
            placeholder="Select account"
            options={accountOptions}
            value={values.accountId}
            disabled={isUpdate}
            onValueChange={(v) => onAccountChange(v as string)}
            action={isUpdate ? undefined : { label: 'Add account', onSelect: onAddAccount }}
            error={errors.accountId}
          />
        )}
      </div>
      {noAccountYet ? (
        <EmptyState
          size="sm"
          title="No account to record this against yet"
          description="Add a bank account, credit card or wallet to save this transaction."
          action={{ label: 'Add account', variant: 'secondary', onSelect: onAddAccount }}
        />
      ) : null}

      {cardOptions.length > 0 ? (
        <Select
          label="Card"
          options={[{ value: NO_CARD, label: 'Unattributed' }, ...cardOptions.map((c) => ({ value: c.id, label: c.label }))]}
          value={values.cardId}
          onValueChange={(v) => onChange({ cardId: v as string })}
        />
      ) : null}

      <TextArea
        label="Description"
        placeholder="What was it?"
        value={values.description}
        onValueChange={(description) => onChange({ description })}
        onBlur={onDescriptionBlur}
        helper={descriptionHelper}
      />

      <CategoriesField
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        creating={creatingCategory}
        onChange={onCategoriesChange}
        onCreate={onCreateCategory}
      />


      {isUpdate ? (
        <>
          <Select
            label="Review status"
            options={REVIEW_OPTIONS(isUpdate)}
            value={values.reviewType}
            onValueChange={(v) => onChange({ reviewType: v as ReviewType })}
            error={reviewError}
          />
          {values.reviewType === 'NEEDS_REVIEW' ? (
            <Select
              label="Why it needs review"
              placeholder="Pick the reasons"
              multiple
              options={REASON_OPTIONS}
              value={values.reviewReasons}
              onValueChange={(v) => onChange({ reviewReasons: v as TransactionFormValues['reviewReasons'] })}
            />
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col">
        <SettingsToggle
          label="Exclude transaction"
          description="Left out of totals and reports"
          checked={values.excluded}
          onCheckedChange={(excluded) => onChange({ excluded })}
        />
        <SettingsToggle
          borderTop
          label="Monitor transaction"
          description="Shows as Watching until you clear it"
          checked={values.monitored}
          onCheckedChange={(monitored) => onChange({ monitored })}
        />
      </div>
      {values.monitored ? (
        <TextField
          aria-label="Why this transaction is monitored"
          placeholder="Explain why this transaction is being monitored (optional)"
          value={values.monitoringReason}
          onValueChange={(monitoringReason) => onChange({ monitoringReason })}
        />
      ) : null}

      <SectionHeader variant="band" className="-mx-space-16 desk:-mx-space-20">
        Reward details
      </SectionHeader>
      <Pair>
        <DateField
          label="Settlement date"
          today={today}
          placeholder="Not set"
          value={values.settlementDate}
          onValueChange={(v) => onChange({ settlementDate: typeof v === 'string' ? v : '' })}
        />
        <Select
          label="Channel"
          options={CHANNEL_OPTIONS}
          value={values.channel}
          onValueChange={(v) => onChange({ channel: v as TransactionFormValues['channel'] })}
        />
      </Pair>
      <Pair>
        <AmountField
          label="Instant discount"
          prefix="₹"
          inputMode="decimal"
          placeholder="0.00"
          value={values.instantDiscount}
          {...amountExpressionProps(values.instantDiscount, (v) => onChange({ instantDiscount: v }))}
          error={errors.instantDiscount}
        />
        <AmountField
          label="Convenience fee"
          prefix="₹"
          inputMode="decimal"
          placeholder="0.00"
          value={values.convenienceFee}
          {...amountExpressionProps(values.convenienceFee, (v) => onChange({ convenienceFee: v }))}
          error={errors.convenienceFee}
        />
      </Pair>
      <TextField
        label="MCC code"
        optional
        inputMode="numeric"
        maxLength={4}
        placeholder="e.g. 5411"
        value={values.mcc}
        onValueChange={(v) => onChange({ mcc: v.replace(/\D/g, '') })}
        error={errors.mcc}
      />
      <div className="flex flex-col">
        <SettingsToggle
          label="EMI transaction"
          description="Converted to instalments by the bank"
          checked={values.emi}
          onCheckedChange={(emi) => onChange({ emi })}
        />
        <SettingsToggle
          borderTop
          label="International transaction"
          description="Forex markup applies"
          checked={values.international}
          onCheckedChange={(international) => onChange({ international })}
        />
      </div>
    </>
  );
}
