'use client';

import React from 'react';
import { toast } from 'sonner';

import { Card, CardEmpty, CardSection, ListRow, Switch, Text } from '@/components/ds';
import type { Account } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { LoanResponse, NotificationSettingsResponse } from '@/lib/api/types';

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
  const busy = mute.isPending || muteLoan.isPending;

  const toggleCard = async (accountId: string, muted: boolean) => {
    try {
      await mute.mutateAsync({ accountId, muted });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update the card'));
    }
  };

  const toggleLoan = async (loanId: string, muted: boolean) => {
    try {
      await muteLoan.mutateAsync({ loanId, muted });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update the loan'));
    }
  };

  return (
    <Card title="Muted" subtitle="Per card or loan">
      <CardSection>Cards</CardSection>
      {cards.length === 0 ? (
        <CardEmpty>No open credit cards yet.</CardEmpty>
      ) : (
        cards.map((card) => (
          <ListRow
            key={card.id}
            title={<Text variant="body">{card.name}</Text>}
            trailing={
              <Switch
                aria-label={`Mute ${card.name}`}
                checked={mutedCards.has(card.id)}
                disabled={busy}
                onCheckedChange={(v) => void toggleCard(card.id, v)}
              />
            }
          />
        ))
      )}
      <CardSection>Loans</CardSection>
      {loans.length === 0 ? (
        <CardEmpty>No active loans yet.</CardEmpty>
      ) : (
        loans.map((loan) => (
          <ListRow
            key={loan.id}
            title={<Text variant="body">{loan.name}</Text>}
            trailing={
              <Switch
                aria-label={`Mute ${loan.name}`}
                checked={mutedLoans.has(loan.id)}
                disabled={busy}
                onCheckedChange={(v) => void toggleLoan(loan.id, v)}
              />
            }
          />
        ))
      )}
    </Card>
  );
}
