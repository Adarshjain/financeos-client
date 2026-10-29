'use client';

import React from 'react';

import { DateField, Select, Text, TextField } from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { RELATIONSHIP_LABELS } from '@/features/accounts/cards/constants';
import type {
  Cardholder,
  CardholderRelationship,
  CreateCardholderRequest,
} from '@/lib/account.types';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';

import {
  buildAddHolder,
  buildEditHolder,
  digitsOnly,
  type EditHolderBody,
  futureDateError,
} from './cardsFormsModel';
import { roleLabel } from './cardsModel';
import { DialogFrame, useDialogSubmit } from './DialogFrame';
import type { ActionResult } from './useCardholderMutations';

const RELATIONSHIP_OPTIONS = Object.entries(RELATIONSHIP_LABELS)
  .filter(([value]) => value !== 'SELF')
  .map(([value, label]) => ({ value, label }));

const iso = (v: string | { start?: string; end?: string }) => (typeof v === 'string' ? v : '');

/** Add add-on cardholder (credit card) or Add joint holder (bank), with its optional first card. */
export function AddHolderDialog({
  isBank,
  accountName,
  today,
  onSubmit,
  onClose,
}: {
  isBank: boolean;
  accountName: string;
  today: string;
  onSubmit: (body: CreateCardholderRequest) => ActionResult;
  onClose: () => void;
}) {
  const [name, setName] = React.useState('');
  const [relationship, setRelationship] = React.useState<CardholderRelationship>('SPOUSE');
  const [spendLimit, setSpendLimit] = React.useState('');
  const [openedOn, setOpenedOn] = React.useState(today);
  const [last4, setLast4] = React.useState('');
  const [issuedOn, setIssuedOn] = React.useState(today);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { pending, error, submit } = useDialogSubmit(onClose);

  const handle = () => {
    const resolvedLimit = resolveAmountExpression(spendLimit);
    setSpendLimit(resolvedLimit);
    const built = buildAddHolder(
      { name, relationship, spendLimit: resolvedLimit, openedOn, last4, issuedOn },
      today
    );
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setErrors({});
    void submit(() => onSubmit(built.body));
  };

  return (
    <DialogFrame
      title={isBank ? 'Add joint holder' : 'Add add-on cardholder'}
      description={accountName}
      submitLabel={isBank ? 'Add joint holder' : 'Add cardholder'}
      onSubmit={handle}
      onClose={onClose}
      loading={pending}
      error={error}
    >
      <TextField label="Name" value={name} onValueChange={setName} error={errors.name} />
      <Select
        label="Relationship"
        value={relationship}
        onValueChange={(v) => setRelationship(v as CardholderRelationship)}
        options={RELATIONSHIP_OPTIONS}
      />
      <AmountField
        label="Monthly spend limit"
        optional
        prefix="₹"
        inputMode="decimal"
        value={spendLimit}
        {...amountExpressionProps(spendLimit, setSpendLimit)}
        error={errors.spendLimit}
      />
      <DateField
        label="Opened on"
        today={today}
        maxDate={today}
        value={openedOn}
        onValueChange={(v) => setOpenedOn(iso(v))}
        error={errors.openedOn ?? futureDateError('opened', openedOn, today) ?? undefined}
      />
      <Text variant="overline" tone="ink-3" as="div">
        First card
      </Text>
      <TextField
        label="Last 4 digits"
        optional
        inputMode="numeric"
        maxLength={4}
        value={last4}
        onValueChange={(v) => setLast4(digitsOnly(v))}
        error={errors.last4}
      />
      <DateField
        label="Issued on"
        optional
        today={today}
        maxDate={today}
        value={issuedOn}
        onValueChange={(v) => setIssuedOn(iso(v))}
        error={
          errors.issuedOn ?? (last4 ? (futureDateError('issued', issuedOn, today) ?? undefined) : undefined)
        }
      />
    </DialogFrame>
  );
}

/** Edit cardholder: name, relationship (fixed for the primary), spend limit and the opened date. */
export function EditHolderDialog({
  holder,
  isBank,
  accountName,
  today,
  onSubmit,
  onClose,
}: {
  holder: Cardholder;
  isBank: boolean;
  accountName: string;
  today: string;
  onSubmit: (body: EditHolderBody) => ActionResult;
  onClose: () => void;
}) {
  const primary = holder.role === 'PRIMARY';
  const [name, setName] = React.useState(holder.personName ?? '');
  const [relationship, setRelationship] = React.useState<CardholderRelationship>(
    holder.relationship ?? 'OTHER'
  );
  const [spendLimit, setSpendLimit] = React.useState(
    holder.spendLimit ? String(holder.spendLimit) : ''
  );
  const [openedOn, setOpenedOn] = React.useState(holder.openedOn ?? '');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { pending, error, submit } = useDialogSubmit(onClose);

  const handle = () => {
    const resolvedLimit = resolveAmountExpression(spendLimit);
    setSpendLimit(resolvedLimit);
    const built = buildEditHolder(holder, { name, relationship, spendLimit: resolvedLimit, openedOn }, today);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setErrors({});
    void submit(() => onSubmit(built.body));
  };

  return (
    <DialogFrame
      title="Edit cardholder"
      description={`${holder.personName || roleLabel(holder.role, isBank)} · ${roleLabel(holder.role, isBank).toLowerCase()} on ${accountName}`}
      submitLabel="Save cardholder"
      onSubmit={handle}
      onClose={onClose}
      loading={pending}
      error={error}
    >
      <TextField label="Name" value={name} onValueChange={setName} />
      <Select
        label="Relationship"
        value={primary ? 'SELF' : relationship}
        onValueChange={(v) => setRelationship(v as CardholderRelationship)}
        options={
          primary
            ? [{ value: 'SELF', label: RELATIONSHIP_LABELS.SELF }]
            : RELATIONSHIP_OPTIONS
        }
        disabled={primary}
      />
      <AmountField
        label="Spend limit"
        optional
        prefix="₹"
        inputMode="decimal"
        value={spendLimit}
        {...amountExpressionProps(spendLimit, setSpendLimit)}
        error={errors.spendLimit}
        helper={primary ? undefined : 'Leave empty when the add-on shares the full card limit.'}
      />
      <DateField
        label="Opened on"
        today={today}
        maxDate={today}
        value={openedOn}
        onValueChange={(v) => setOpenedOn(iso(v))}
        error={errors.openedOn ?? futureDateError('opened', openedOn, today) ?? undefined}
      />
    </DialogFrame>
  );
}
