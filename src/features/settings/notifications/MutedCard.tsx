'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Switch } from '@/components/ds/Switch/Switch';
import { Text } from '@/components/ds/Text/Text';
import type { Account } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { LoanResponse, NotificationSettingsResponse } from '@/lib/api/types';
import { notify } from '@/lib/notify';

import { useNotificationSettingsMutations } from './useNotificationSettings';

interface MutedCardProps {
  settings: NotificationSettingsResponse;
  cards: Account[];
  loans: LoanResponse[];
}

/** Per-card and per-loan opt-out: a muted card or loan still shows everywhere, it just never pushes. */
export function MutedCard({ settings, cards, loans }: MutedCardProps) {
  const { mute, muteLoan } = useNotificationSettingsMutations();
  const mutedCards = new Set(settings.mutedAccountIds ?? []);
  const mutedLoans = new Set(settings.mutedLoanIds ?? []);

  const toggleCard = async (accountId: string, muted: boolean) => {
    try {
      await mute.mutateAsync({ accountId, muted });
    } catch (e) {
      notify.error(getErrorMessage(e, "Couldn't update the card. Try again."));
    }
  };

  const toggleLoan = async (loanId: string, muted: boolean) => {
    try {
      await muteLoan.mutateAsync({ loanId, muted });
    } catch (e) {
      notify.error(getErrorMessage(e, "Couldn't update the loan. Try again."));
    }
  };

  return (
    <Card title="Muted" subtitle="Per card or loan">
      <Card.Section>Cards</Card.Section>
      {cards.length === 0 ? (
        <Card.Empty>No open credit cards yet</Card.Empty>
      ) : (
        cards.map((card) => (
          <ListRow
            key={card.id}
            title={<Text variant="body">{card.name}</Text>}
            trailing={
              <Switch
                aria-label={`Mute ${card.name}`}
                checked={mutedCards.has(card.id)}
                onCheckedChange={(v) => void toggleCard(card.id, v)}
              />
            }
          />
        ))
      )}
      <Card.Section>Loans</Card.Section>
      {loans.length === 0 ? (
        <Card.Empty>No active loans yet</Card.Empty>
      ) : (
        loans.map((loan) => (
          <ListRow
            key={loan.id}
            title={<Text variant="body">{loan.name}</Text>}
            trailing={
              <Switch
                aria-label={`Mute ${loan.name}`}
                checked={mutedLoans.has(loan.id)}
                onCheckedChange={(v) => void toggleLoan(loan.id, v)}
              />
            }
          />
        ))
      )}
    </Card>
  );
}
