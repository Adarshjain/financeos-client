'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { GRID_GAP } from '@/components/ds/gridGap';
import { Text } from '@/components/ds/Text/Text';
import { LoadError } from '@/features/shell/LoadError';
import type { Account } from '@/lib/account.types';
import { unwrapAction } from '@/lib/actionResult';
import type { LoanResponse, NotificationSettingsResponse } from '@/lib/api/types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';

import { BillsCard } from './BillsCard';
import { KindsCard } from './KindsCard';
import { MutedCard } from './MutedCard';
import { loadActiveLoans } from './notificationActions';
import { KIND_GROUPS } from './notificationKinds';
import { NotificationsSkeleton } from './NotificationsSkeleton';
import { PushCard } from './PushCard';
import { useNotificationSettings } from './useNotificationSettings';
import { useThisBrowser } from './useThisBrowser';

/** The settings page lists every active loan for muting; more than this is not a personal ledger. */
const LOANS_PAGE = { status: 'active' as const, page: 0, size: 50 };

function Loaded({ settings, cards, loans }: { settings: NotificationSettingsResponse; cards: Account[]; loans: LoanResponse[] }) {
  const browser = useThisBrowser(settings);
  const [statements, ...rest] = KIND_GROUPS;
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
    <Text variant="caption" tone="ink-3" as="p">
      Changes save automatically
    </Text>
    <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
      <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16">
        <PushCard settings={settings} browser={browser} />
        <BillsCard settings={settings} />
        <KindsCard settings={settings} group={statements} />
      </div>
      <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16">
        {rest.map((group) => (
          <KindsCard key={group.title} settings={settings} group={group} />
        ))}
        <MutedCard settings={settings} cards={cards} loans={loans} />
      </div>
    </div>
    </div>
  );
}

function pickCards(data: unknown): Account[] {
  const accounts = Array.isArray(data) ? (data as Account[]) : [];
  return accounts.filter((a) => a.type === AccountType.CREDIT_CARD && !a.closedOn);
}

/** Notification settings: reminders, what to tell me about, devices and mutes. The server row is created on first write. */
export function NotificationsSettings() {
  const settingsQuery = useNotificationSettings();
  const accountsQuery = useAccounts();
  const loansQuery = useQuery({
    queryKey: keys.loans.list(LOANS_PAGE),
    queryFn: () => unwrapAction(loadActiveLoans(LOANS_PAGE)),
  });
  const settings = settingsQuery.data ?? null;
  const cards = React.useMemo(() => pickCards(accountsQuery.data), [accountsQuery.data]);

  if (settingsQuery.isLoading && !settings) return <NotificationsSkeleton />;
  if (!settings) {
    return <LoadError what="notification settings" retry={() => void settingsQuery.refetch()} />;
  }
  return <Loaded settings={settings} cards={cards} loans={loansQuery.data ?? []} />;
}
