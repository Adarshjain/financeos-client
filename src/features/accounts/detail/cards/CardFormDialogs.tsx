'use client';

import React from 'react';

import { DateField, Text, TextField } from '@/components/ds';
import type { Card, CreateCardRequest, ReplaceCardRequest } from '@/lib/account.types';

import { buildAddCard, buildClose, buildReplaceCard, digitsOnly, futureDateError } from './cardsFormsModel';
import { DialogFrame, useDialogSubmit } from './DialogFrame';
import type { ActionResult } from './useCardholderMutations';

const iso = (v: string | { start?: string; end?: string }) => (typeof v === 'string' ? v : '');

/** Add a card to a holder with none active, or the first debit card of a bank account. */
export function AddCardDialog({
  title,
  description,
  submitLabel,
  last4Message,
  today,
  onSubmit,
  onClose,
}: {
  title: string;
  description: string;
  submitLabel: string;
  /** The live validation message for this flow. */
  last4Message?: string;
  today: string;
  onSubmit: (body: CreateCardRequest) => ActionResult;
  onClose: () => void;
}) {
  const [last4, setLast4] = React.useState('');
  const [issuedOn, setIssuedOn] = React.useState(today);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { pending, error, submit } = useDialogSubmit(onClose);

  const handle = () => {
    const built = buildAddCard({ last4, issuedOn }, today, last4Message);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setErrors({});
    void submit(() => onSubmit(built.body));
  };

  return (
    <DialogFrame
      title={title}
      description={description}
      submitLabel={submitLabel}
      onSubmit={handle}
      onClose={onClose}
      pending={pending}
      error={error}
    >
      <TextField
        label="Last 4 digits"
        placeholder="1234"
        inputMode="numeric"
        maxLength={4}
        value={last4}
        onValueChange={(v) => setLast4(digitsOnly(v))}
        error={errors.last4}
      />
      <DateField
        label="Issued on"
        today={today}
        maxDate={today}
        value={issuedOn}
        onValueChange={(v) => setIssuedOn(iso(v))}
        error={errors.issuedOn ?? futureDateError('issued', issuedOn, today) ?? undefined}
      />
    </DialogFrame>
  );
}

export function ReplaceCardDialog({
  card,
  holderName,
  today,
  onSubmit,
  onClose,
}: {
  card: Card;
  holderName: string;
  today: string;
  onSubmit: (body: ReplaceCardRequest) => ActionResult;
  onClose: () => void;
}) {
  const [newLast4, setNewLast4] = React.useState('');
  const [issuedOn, setIssuedOn] = React.useState(today);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { pending, error, submit } = useDialogSubmit(onClose);

  const handle = () => {
    const built = buildReplaceCard({ newLast4, issuedOn }, today);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setErrors({});
    void submit(() => onSubmit(built.body));
  };

  return (
    <DialogFrame
      title={`Replace card ••${card.last4}`}
      description={holderName}
      submitLabel="Replace card"
      onSubmit={handle}
      onClose={onClose}
      pending={pending}
      error={error}
    >
      <Text variant="body" tone="ink-2" as="p">
        The new card takes over from today. Reward rules, caps and transaction history stay with{' '}
        {holderName}.
      </Text>
      <TextField
        label="New last 4 digits"
        placeholder="5678"
        inputMode="numeric"
        maxLength={4}
        value={newLast4}
        onValueChange={(v) => setNewLast4(digitsOnly(v))}
        error={errors.newLast4}
      />
      <DateField
        label="Issued on"
        today={today}
        maxDate={today}
        value={issuedOn}
        onValueChange={(v) => setIssuedOn(iso(v))}
        error={errors.issuedOn ?? futureDateError('issued', issuedOn, today) ?? undefined}
      />
    </DialogFrame>
  );
}

/** Close a card, or close a cardholder: the same form with a different sentence and verb. */
export function CloseDialog({
  title,
  description,
  message,
  submitLabel,
  today,
  onSubmit,
  onClose,
}: {
  title: string;
  description: string;
  message: string;
  submitLabel: string;
  today: string;
  onSubmit: (body: { closedOn?: string }) => ActionResult;
  onClose: () => void;
}) {
  const [closedOn, setClosedOn] = React.useState(today);
  const { pending, error, submit } = useDialogSubmit(onClose);
  const date = futureDateError('closed', closedOn, today);

  const handle = () => {
    const built = buildClose(closedOn, today);
    if (!built.ok) return;
    void submit(() => onSubmit(built.body));
  };

  return (
    <DialogFrame
      title={title}
      description={description}
      submitLabel={submitLabel}
      onSubmit={handle}
      onClose={onClose}
      pending={pending}
      error={error}
    >
      <Text variant="body" tone="ink-2" as="p">
        {message}
      </Text>
      <DateField
        label="Closed on"
        today={today}
        maxDate={today}
        value={closedOn}
        onValueChange={(v) => setClosedOn(iso(v))}
        error={date ?? undefined}
      />
    </DialogFrame>
  );
}
