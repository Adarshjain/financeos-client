'use client';

import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { Account } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse } from '@/lib/api/types';
import { useNotificationSettingsMutations } from '@/lib/query/hooks/useNotificationSettings';

interface CardMutesCardProps {
  settings: NotificationSettingsResponse;
  cards: Account[];
}

/** Per-card opt-out: a muted card still shows on the dashboard, it just never pushes. */
export function CardMutesCard({ settings, cards }: CardMutesCardProps) {
  const { mute } = useNotificationSettingsMutations();
  const muted = new Set(settings.mutedAccountIds ?? []);

  const toggle = async (accountId: string, next: boolean) => {
    try {
      await mute.mutateAsync({ accountId, muted: next });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update the card'));
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <CreditCard className="h-4 w-4 text-slate-400" />
          Cards
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {cards.length === 0 ? (
          <p className="text-xs text-slate-500">No open credit cards yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-testid="card-mutes">
            {cards.map((card) => {
              const isMuted = muted.has(card.id);
              return (
                <li key={card.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{card.name}</span>
                  <label className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                    <Checkbox
                      checked={isMuted}
                      disabled={mute.isPending}
                      onCheckedChange={(v) => toggle(card.id, v === true)}
                      aria-label={`Mute ${card.name}`}
                    />
                    Muted
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-2xs text-slate-400 mt-2">Mute a card that pays itself (autopay) or one you track elsewhere.</p>
      </CardContent>
    </Card>
  );
}
