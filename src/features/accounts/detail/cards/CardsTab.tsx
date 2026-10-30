'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card as DsCard } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { GRID_GAP } from '@/components/ds/gridGap';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { LoadError } from '@/features/shell/LoadError';
import type { Card, Cardholder } from '@/lib/account.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { replaceUrl } from '@/lib/urlState';

import { type CardsModel, type HolderMenuId, holderName, type HolderStats } from './cardsModel';
import { ClosedHolders, HolderCard } from './HolderCard';
import { SharedLimitCard } from './SharedLimitCard';
import { useCardholderMutations } from './useCardholderMutations';

const loadCardDialogs = async () => {
  const [forms, actions, holders] = await Promise.all([import('./CardFormDialogs'), import('./HolderActionDialogs'), import('./HolderFormDialogs')]);
  return { ...forms, ...actions, ...holders };
};

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
  const actions = useCardholderMutations(accountId, isBank);
  const [dialog, setDialogState] = React.useState<DialogState | null>(null);
  // The cardholder and card forms are not in the page: their code loads when one is opened (see useLazyDialog).
  const { Component: dialogs, run: runDialog } = useLazyDialog(loadCardDialogs);
  const setDialog = React.useCallback(
    (next: DialogState | null) => (next === null ? setDialogState(null) : void runDialog(() => setDialogState(next))),
    [runDialog],
  );

  // The overview's Cardholders "Add" links here with ?add=cardholder: open once on load, then clear it
  // from the URL with replaceState (no server request), so a reload does not reopen the dialog.
  React.useEffect(() => {
    const { pathname, search } = window.location;
    const query = new URLSearchParams(search);
    if (query.get('add') !== 'cardholder') return;
    setDialog({ kind: 'addHolder' });
    query.delete('add');
    const rest = query.toString();
    replaceUrl(rest ? `${pathname}?${rest}` : pathname);
  }, [setDialog]);

  const closeDialog = () => setDialog(null);

  if (!cardholders || !model) {
    return (
      <LoadError what="cardholders" />
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
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {model.intro ? (
        <Text variant="body" tone="ink-2" as="p">
          {model.intro}
        </Text>
      ) : null}

      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDialog({ kind: isBank && empty ? 'addPrimaryCard' : 'addHolder' })}
        >
          {isBank ? (empty ? 'Add your debit card' : 'Add joint holder') : 'Add add-on cardholder'}
        </Button>
      </div>

      {empty ? (
        <DsCard>
          <EmptyState title={isBank ? 'No debit cards yet' : 'No cardholders yet'} />
        </DsCard>
      ) : null}

      {model.open.length > 0 ? (
        <div className={`grid grid-cols-1 desk:grid-cols-2 items-start ${GRID_GAP}`}>
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

      {dialogs ? (
        <>
      {dialog?.kind === 'addHolder' ? (
        <dialogs.AddHolderDialog
          isBank={isBank}
          accountName={accountName}
          today={today}
          onSubmit={actions.addHolder}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'addPrimaryCard' ? (
        <dialogs.AddCardDialog
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
        <dialogs.EditHolderDialog
          holder={holder}
          isBank={isBank}
          accountName={accountName}
          today={today}
          onSubmit={(body) => actions.editHolder(holder, body)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'addCard' && holder ? (
        <dialogs.AddCardDialog
          title="Add a card"
          description={`${name} · ${accountName}`}
          submitLabel="Add card"
          today={today}
          onSubmit={(body) => actions.addCard(holder, body)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'replace' && holder && card ? (
        <dialogs.ReplaceCardDialog
          card={card}
          holderName={name}
          today={today}
          onSubmit={(body) => actions.replaceCard(holder, card, body)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'closeCard' && holder && card ? (
        <dialogs.CloseDialog
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
        <dialogs.CloseDialog
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
        <dialogs.ReassignDialog
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
        <dialogs.DeleteHolderDialog
          holder={holder}
          isBank={isBank}
          onConfirm={() => actions.deleteHolder(holder)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'deleteCard' && holder && card ? (
        <dialogs.DeleteCardDialog
          card={card}
          holderName={name}
          transactionCount={
            statsOf(holder.id)?.cards?.find((c) => c.cardId === card.id)?.transactionCount ?? null
          }
          onConfirm={() => actions.deleteCard(holder, card)}
          onClose={closeDialog}
        />
      ) : null}
        </>
      ) : null}
    </div>
  );
}
