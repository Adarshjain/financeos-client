'use client';

import React from 'react';

import { DateField } from '@/components/ds/DateField/DateField';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { FROM_EMAIL_CAPTION } from '@/features/accounts/form/ds/suggestionPrefill';
import type { Card, CreateCardRequest, ReplaceCardRequest } from '@/lib/account.types';
import type { CardSeenDates } from '@/lib/api/types';

import { buildAddCard, buildClose, buildPastCard, buildReplaceCard, digitsOnly, futureDateError, seenHint } from './cardsFormsModel';
import { DialogFrame, useDialogSubmit } from './DialogFrame';
import type { ActionResult } from './useCardholderMutations';

const iso = (v: string | { start?: string; end?: string }) => (typeof v === 'string' ? v : '');

/** The suggestion a card dialog is opened from: its id goes with the request and its number fills the field. */
export interface CardFromSuggestion {
  id: string;
  last4: string;
}

/** Add a card to a holder with none active, or the first debit card of a bank account. */
export function AddCardDialog({
  title,
  description,
  submitLabel,
  last4Message,
  today,
  fromSuggestion,
  onSubmit,
  onClose,
}: {
  title: string;
  description: string;
  submitLabel: string;
  /** The live validation message for this flow. */
  last4Message?: string;
  today: string;
  fromSuggestion?: CardFromSuggestion;
  onSubmit: (body: CreateCardRequest) => ActionResult;
  onClose: () => void;
}) {
  const [last4, setLast4] = React.useState(fromSuggestion?.last4 ?? '');
  const [issuedOn, setIssuedOn] = React.useState(today);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { pending, error, submit } = useDialogSubmit(onClose);

  const handle = () => {
    const built = buildAddCard({ last4, issuedOn, fromSuggestionId: fromSuggestion?.id }, today, last4Message);
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
      loading={pending}
      error={error}
    >
      <TextField
        label="Last 4 digits"
        placeholder="1234"
        inputMode="numeric"
        maxLength={4}
        value={last4}
        onValueChange={(v) => setLast4(digitsOnly(v))}
        helper={fromSuggestion?.last4 && last4 === fromSuggestion.last4 ? FROM_EMAIL_CAPTION : undefined}
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

/** Add a card that is already closed (an earlier number): when its 4 digits are typed, the dates it was seen fill the opened and closed dates. */
export function AddPastCardDialog({
  description,
  today,
  loadSeenDates,
  onSubmit,
  onClose,
}: {
  description: string;
  today: string;
  /** Looks up when this number was seen in the account's mail and transactions; null when nothing is known. */
  loadSeenDates: (last4: string) => Promise<CardSeenDates | null>;
  onSubmit: (body: CreateCardRequest) => ActionResult;
  onClose: () => void;
}) {
  const [last4, setLast4] = React.useState('');
  const [issuedOn, setIssuedOn] = React.useState('');
  const [closedOn, setClosedOn] = React.useState('');
  const [hint, setHint] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { pending, error, submit } = useDialogSubmit(onClose);
  // A date the user typed is theirs: a later lookup never overwrites it.
  const touched = React.useRef({ issuedOn: false, closedOn: false });

  React.useEffect(() => {
    setHint(null);
    if (last4.length !== 4) return;
    let current = true;
    loadSeenDates(last4)
      .then((seen) => {
        if (!current || !seen) return;
        setHint(seenHint(seen));
        if (seen.firstSeen && !touched.current.issuedOn) setIssuedOn(seen.firstSeen);
        if (seen.lastSeen && !touched.current.closedOn) setClosedOn(seen.lastSeen);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
    // loadSeenDates is a new closure each render of the parent; the number is what triggers a lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last4]);

  const handle = () => {
    const built = buildPastCard({ last4, issuedOn, closedOn }, today);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setErrors({});
    void submit(() => onSubmit(built.body));
  };

  return (
    <DialogFrame title="Add a past card" description={description} submitLabel="Add past card" onSubmit={handle} onClose={onClose} loading={pending} error={error}>
      <TextField
        label="Last 4 digits"
        placeholder="1234"
        inputMode="numeric"
        maxLength={4}
        value={last4}
        onValueChange={(v) => setLast4(digitsOnly(v))}
        helper={hint ?? undefined}
        error={errors.last4}
      />
      <DateField
        label="Opened on"
        today={today}
        maxDate={today}
        value={issuedOn}
        onValueChange={(v) => {
          touched.current.issuedOn = true;
          setIssuedOn(iso(v));
        }}
        error={errors.issuedOn ?? futureDateError('opened', issuedOn, today) ?? undefined}
      />
      <DateField
        label="Closed on"
        today={today}
        maxDate={today}
        value={closedOn}
        onValueChange={(v) => {
          touched.current.closedOn = true;
          setClosedOn(iso(v));
        }}
        error={errors.closedOn ?? futureDateError('closed', closedOn, today) ?? undefined}
      />
    </DialogFrame>
  );
}

export function ReplaceCardDialog({
  card,
  holderName,
  today,
  fromSuggestion,
  onSubmit,
  onClose,
}: {
  card: Card;
  holderName: string;
  today: string;
  fromSuggestion?: CardFromSuggestion;
  onSubmit: (body: ReplaceCardRequest) => ActionResult;
  onClose: () => void;
}) {
  const [newLast4, setNewLast4] = React.useState(fromSuggestion?.last4 ?? '');
  const [issuedOn, setIssuedOn] = React.useState(today);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { pending, error, submit } = useDialogSubmit(onClose);

  const handle = () => {
    const built = buildReplaceCard({ newLast4, issuedOn, fromSuggestionId: fromSuggestion?.id }, today);
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
      loading={pending}
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
        helper={fromSuggestion?.last4 && newLast4 === fromSuggestion.last4 ? FROM_EMAIL_CAPTION : undefined}
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
      loading={pending}
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
