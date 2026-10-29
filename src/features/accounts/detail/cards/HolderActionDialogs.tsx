'use client';

import React from 'react';

import { Banner, ConfirmDialog, DateField, Select } from '@/components/ds';
import type { Card, Cardholder } from '@/lib/account.types';
import { pluralize } from '@/lib/format';
import type { BulkReattributeCardRequest } from '@/lib/transaction.types';

import { buildReassign, reassignSources, UNATTRIBUTED } from './cardsFormsModel';
import { holderName } from './cardsModel';
import { DialogFrame, useDialogSubmit } from './DialogFrame';
import type { ActionResult } from './useCardholderMutations';

const iso = (v: string | { start?: string; end?: string }) => (typeof v === 'string' ? v : '');

/** Moves past transactions to this holder's card, from unattributed rows or another holder's card. */
export function ReassignDialog({
  accountId,
  holder,
  targetCard,
  cardholders,
  isBank,
  today,
  onSubmit,
  onClose,
}: {
  accountId: string;
  holder: Cardholder;
  targetCard: Card | undefined;
  cardholders: readonly Cardholder[];
  isBank: boolean;
  today: string;
  onSubmit: (body: BulkReattributeCardRequest) => ActionResult;
  onClose: () => void;
}) {
  const [source, setSource] = React.useState(UNATTRIBUTED);
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const { pending, error, submit } = useDialogSubmit(onClose);
  const name = holderName(holder, isBank);
  const target = targetCard ?? (holder.cards ?? []).find((c) => !c.closedOn);

  const handle = () => {
    const built = buildReassign(accountId, holder, targetCard, { source, from, to });
    if (!built.ok) {
      setFormError(built.errors.form ?? null);
      return;
    }
    setFormError(null);
    void submit(() => onSubmit(built.body));
  };

  return (
    <DialogFrame
      title="Reassign transactions"
      description={`Move past transactions to ${name}${target ? ` · ••${target.last4}` : ''}.`}
      submitLabel="Reassign"
      onSubmit={handle}
      onClose={onClose}
      loading={pending}
      error={error ?? formError}
    >
      <Select
        label="From"
        value={source}
        onValueChange={(v) => setSource(v as string)}
        options={reassignSources(holder, cardholders, (h) => holderName(h, isBank))}
      />
      <DateField
        label="From date"
        optional
        today={today}
        value={from}
        onValueChange={(v) => setFrom(iso(v))}
      />
      <DateField
        label="To date"
        optional
        today={today}
        value={to}
        onValueChange={(v) => setTo(iso(v))}
      />
    </DialogFrame>
  );
}

/** Confirm before deleting a holder that has no transactions: says what goes and what stays. */
export function DeleteHolderDialog({
  holder,
  isBank,
  onConfirm,
  onClose,
}: {
  holder: Cardholder;
  isBank: boolean;
  onConfirm: () => ActionResult;
  onClose: () => void;
}) {
  const { pending, error, submit } = useDialogSubmit(onClose);
  const name = holderName(holder, isBank);
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={`Delete cardholder ${name}?`}
      description={`Removes ${name} and every card they hold. No transactions are attached to ${name}. This can't be undone.`}
      confirmLabel="Delete cardholder"
      onConfirm={() => void submit(onConfirm)}
      onCancel={onClose}
      loading={pending}
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}
    </ConfirmDialog>
  );
}

/** Confirm before deleting an old (replaced or closed) card entry: says what goes and what stays. */
export function DeleteCardDialog({
  card,
  holderName: name,
  transactionCount,
  onConfirm,
  onClose,
}: {
  card: Card;
  holderName: string;
  /** Transactions on this card; unknown when stats did not load. */
  transactionCount: number | null;
  onConfirm: () => ActionResult;
  onClose: () => void;
}) {
  const { pending, error, submit } = useDialogSubmit(onClose);
  const stays =
    transactionCount == null
      ? `Its transactions stay with ${name}.`
      : `Its ${transactionCount} ${pluralize(transactionCount, 'transaction stays', 'transactions stay')} with ${name}.`;
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={`Delete card ••${card.last4}?`}
      description={`Removes this old card from ${name}’s card list. ${stays} This can't be undone.`}
      confirmLabel="Delete card"
      onConfirm={() => void submit(onConfirm)}
      onCancel={onClose}
      loading={pending}
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}
    </ConfirmDialog>
  );
}
