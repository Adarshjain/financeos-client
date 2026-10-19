'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { Button, EmptyState, showToast, Text } from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import type { Card, Cardholder } from '@/lib/account.types';
import { closeDialogParam } from '@/lib/dialogParam';

import { AddCardDialog, CloseDialog, ReplaceCardDialog } from './CardFormDialogs';
import { type CardsModel, type HolderMenuId, holderName, type HolderStats } from './cardsModel';
import { DeleteCardDialog, DeleteHolderDialog, ReassignDialog } from './HolderActionDialogs';
import { ClosedHolders, HolderCard } from './HolderCard';
import { AddHolderDialog, EditHolderDialog } from './HolderFormDialogs';
import { SharedLimitCard } from './SharedLimitCard';
import { useCardholderActions } from './useCardholderActions';

type DialogState =
  | { kind: 'addHolder' }
  | { kind: 'addPrimaryCard' }
  | { kind: 'edit'; holderId: string }
  | { kind: 'addCard'; holderId: string }
  | { kind: 'replace'; holderId: string; cardId: string }
  | { kind: 'closeCard'; holderId: string; cardId: string }
  | { kind: 'closeHolder'; holderId: string }
  | { kind: 'reassign'; holderId: string }
  | { kind: 'deleteHolder'; holderId: string }
  | { kind: 'deleteCard'; holderId: string; cardId: string };

export interface CardsTabProps {
  accountId: string;
  accountName: string;
  isBank: boolean;
  today: string;
  /** Null when the cardholders request failed. */
  cardholders: Cardholder[] | null;
  stats: HolderStats[] | null;
  model: CardsModel | null;
}

/** The Cards tab: one card per open cardholder, the shared limit, closed cardholders, and every dialog they open. */
export function CardsTab({
  accountId,
  accountName,
  isBank,
  today,
  cardholders,
  stats,
  model,
}: CardsTabProps) {
  const router = useRouter();
  const params = useSearchParams();
  const actions = useCardholderActions(accountId, isBank);
  const [dialog, setDialog] = React.useState<DialogState | null>(null);

  const addParam = params.get('add');
  React.useEffect(() => {
    if (addParam === 'cardholder') setDialog({ kind: 'addHolder' });
  }, [addParam]);

  const closeDialog = () => {
    setDialog(null);
    if (params.get('add')) closeDialogParam('add');
  };

  if (!cardholders || !model) {
    return (
      <ErrorState
        title="Could not load cardholders"
        description="The cardholders request failed. Try again, and quote the reference if it keeps failing."
        action={{ label: 'Try again', onSelect: () => router.refresh() }}
      />
    );
  }

  const holderOf = (id: string) => cardholders.find((h) => h.id === id);
  const cardOf = (holder: Cardholder, id: string): Card | undefined =>
    (holder.cards ?? []).find((c) => c.id === id);
  const statsOf = (holderId: string) => stats?.find((s) => s.cardholderId === holderId);

  const onMenu = (holderId: string, id: HolderMenuId) => {
    const holder = holderOf(holderId);
    if (!holder) return;
    switch (id) {
      case 'edit':
        return setDialog({ kind: 'edit', holderId });
      case 'reassign':
        return setDialog({ kind: 'reassign', holderId });
      case 'addCard':
        return setDialog({ kind: 'addCard', holderId });
      case 'close':
        return setDialog({ kind: 'closeHolder', holderId });
      case 'delete':
        return setDialog({ kind: 'deleteHolder', holderId });
      case 'reopen':
        return void reopen(holder);
    }
  };

  const reopen = async (holder: Cardholder) => {
    const message = await actions.reopenHolder(holder);
    if (message) showToast(message, { tone: 'danger' });
  };

  const empty = model.open.length === 0 && model.closed.length === 0;
  const holder = dialog && 'holderId' in dialog ? holderOf(dialog.holderId) : undefined;
  const card = holder && dialog && 'cardId' in dialog ? cardOf(holder, dialog.cardId) : undefined;
  const name = holder ? holderName(holder, isBank) : '';

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      {model.intro ? (
        <Text variant="body" tone="ink-2" as="p">
          {model.intro}
        </Text>
      ) : null}

      {empty ? (
        isBank ? (
          <EmptyState
            title="No debit cards yet"
            action={{
              label: 'Add your debit card',
              onSelect: () => setDialog({ kind: 'addPrimaryCard' }),
              variant: 'primary',
            }}
          />
        ) : (
          <EmptyState title="No cardholders found for this account." />
        )
      ) : null}

      {!(isBank && empty) ? (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: 'addHolder' })}>
            {isBank ? 'Add joint holder' : 'Add add-on cardholder'}
          </Button>
        </div>
      ) : null}

      {model.open.length > 0 ? (
        <div className="grid grid-cols-1 desk:grid-cols-2 items-start gap-space-12 desk:gap-space-16">
          {model.open.map((m) => (
            <HolderCard
              key={m.id}
              model={m}
              onMenu={onMenu}
              onReplace={(holderId, cardId) => setDialog({ kind: 'replace', holderId, cardId })}
              onCloseCard={(holderId, cardId) => setDialog({ kind: 'closeCard', holderId, cardId })}
              onDeleteCard={(holderId, cardId) => setDialog({ kind: 'deleteCard', holderId, cardId })}
              onCloseHolder={(holderId) => setDialog({ kind: 'closeHolder', holderId })}
            />
          ))}
        </div>
      ) : null}

      {model.sharedLimit ? <SharedLimitCard model={model.sharedLimit} /> : null}

      <ClosedHolders
        rows={model.closed}
        onMenu={onMenu}
        onReopen={(holderId) => onMenu(holderId, 'reopen')}
      />

      {dialog?.kind === 'addHolder' ? (
        <AddHolderDialog
          isBank={isBank}
          accountName={accountName}
          today={today}
          onSubmit={actions.addHolder}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'addPrimaryCard' ? (
        <AddCardDialog
          title="Add your debit card"
          description={accountName}
          submitLabel="Add debit card"
          last4Message="Card last 4 digits must be exactly 4 digits."
          today={today}
          onSubmit={actions.addPrimaryCard}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'edit' && holder ? (
        <EditHolderDialog
          holder={holder}
          isBank={isBank}
          accountName={accountName}
          today={today}
          onSubmit={(body) => actions.editHolder(holder, body)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'addCard' && holder ? (
        <AddCardDialog
          title="Add a card"
          description={`${name} · ${accountName}`}
          submitLabel="Add card"
          today={today}
          onSubmit={(body) => actions.addCard(holder, body)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'replace' && holder && card ? (
        <ReplaceCardDialog
          card={card}
          holderName={name}
          today={today}
          onSubmit={(body) => actions.replaceCard(holder, card, body)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'closeCard' && holder && card ? (
        <CloseDialog
          title={`Close card ••${card.last4}`}
          description={name}
          message={`Closes this card number. ${name} stays open and keeps their history.`}
          submitLabel="Close card"
          today={today}
          onSubmit={(body) => actions.closeCard(holder, card, body)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'closeHolder' && holder ? (
        <CloseDialog
          title="Close cardholder"
          description={`${name} · ${isBank ? 'joint holder' : 'add-on'}`}
          message={`Closes ${name} and every card they hold. Past transactions, caps and milestones stay.`}
          submitLabel="Close cardholder"
          today={today}
          onSubmit={(body) => actions.closeHolder(holder, body)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'reassign' && holder ? (
        <ReassignDialog
          accountId={accountId}
          holder={holder}
          targetCard={(holder.cards ?? []).find((c) => !c.closedOn)}
          cardholders={cardholders}
          isBank={isBank}
          today={today}
          onSubmit={actions.reassign}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'deleteHolder' && holder ? (
        <DeleteHolderDialog
          holder={holder}
          isBank={isBank}
          onConfirm={() => actions.deleteHolder(holder)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'deleteCard' && holder && card ? (
        <DeleteCardDialog
          card={card}
          holderName={name}
          transactionCount={
            statsOf(holder.id)?.cards?.find((c) => c.cardId === card.id)?.transactionCount ?? null
          }
          onConfirm={() => actions.deleteCard(holder, card)}
          onClose={closeDialog}
        />
      ) : null}
    </div>
  );
}
