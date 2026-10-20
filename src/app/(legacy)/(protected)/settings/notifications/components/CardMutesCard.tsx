'use client';

import { CreditCard, Landmark } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { Account } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { LoanResponse, NotificationSettingsResponse } from '@/lib/api/types';
import { useNotificationSettingsMutations } from '@/lib/query/hooks/useNotificationSettings';

interface CardMutesCardProps {
  settings: NotificationSettingsResponse;
  cards: Account[];
  loans: LoanResponse[];
}

/**
 * Per-card and per-loan opt-out: a muted card or loan still shows everywhere, it just never
 * pushes. Both lists save on toggle.
 */
export function CardMutesCard({ settings, cards, loans }: CardMutesCardProps) {
  const { mute, muteLoan } = useNotificationSettingsMutations();
  const mutedCards = new Set(settings.mutedAccountIds ?? []);
  const mutedLoans = new Set(settings.mutedLoanIds ?? []);
  const busy = mute.isPending || muteLoan.isPending;

  const toggleCard = async (accountId: string, next: boolean) => {
    try {
      await mute.mutateAsync({ accountId, muted: next });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update the card'));
    }
  };

  const toggleLoan = async (loanId: string, next: boolean) => {
    try {
      await muteLoan.mutateAsync({ loanId, muted: next });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update the loan'));
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <CreditCard className="h-4 w-4 text-slate-400" />
          Cards and loans
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Cards</p>
          {cards.length === 0 ? (
            <p className="text-xs text-slate-500">No open credit cards yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-testid="card-mutes">
              {cards.map((card) => {
                const isMuted = mutedCards.has(card.id);
                return (
                  <li key={card.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{card.name}</span>
                    <label className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                      <Checkbox
                        checked={isMuted}
                        disabled={busy}
                        onCheckedChange={(v) => toggleCard(card.id, v === true)}
                        aria-label={`Mute ${card.name}`}
                      />
                      Muted
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-2xs text-slate-400">Mute a card that pays itself (autopay) or one you track elsewhere.</p>
        </div>

        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
            <Landmark className="h-3.5 w-3.5" />
            Loans
          </p>
          {loans.length === 0 ? (
            <p className="text-xs text-slate-500">No active loans yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-testid="loan-mutes">
              {loans.map((loan) => {
                const isMuted = mutedLoans.has(loan.id);
                return (
                  <li key={loan.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{loan.name}</span>
                    <label className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                      <Checkbox
                        checked={isMuted}
                        disabled={busy}
                        onCheckedChange={(v) => toggleLoan(loan.id, v === true)}
                        aria-label={`Mute ${loan.name}`}
                      />
                      Muted
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-2xs text-slate-400">Mute a loan whose EMI is on a mandate you never think about.</p>
        </div>
      </CardContent>
    </Card>
  );
}
