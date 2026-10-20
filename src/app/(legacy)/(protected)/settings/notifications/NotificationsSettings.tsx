'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { api } from '@/lib/api/client';
import type { LoanResponse } from '@/lib/api/types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useNotificationSettings } from '@/lib/query/hooks/useNotificationSettings';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';

import { CardMutesCard } from './components/CardMutesCard';
import { DevicesCard } from './components/DevicesCard';
import { PreferencesCard } from './components/PreferencesCard';
import { ThisDeviceCard } from './components/ThisDeviceCard';

/** The settings page lists every active loan for muting; more than this is not a personal ledger. */
const LOANS_PAGE = { status: 'active' as const, page: 0, size: 50 };

/**
 * Notification settings: this browser's push registration, what to send and when, which cards
 * and loans are muted, and every registered device. The server row is created on first write.
 */
export function NotificationsSettings() {
  const settingsQuery = useNotificationSettings();
  const accountsQuery = useAccounts();
  const loansQuery = useQuery({
    queryKey: keys.loans.list(LOANS_PAGE),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/loans', { params: { query: LOANS_PAGE } });
      return (data?.content ?? []) as LoanResponse[];
    },
  });
  const settings = settingsQuery.data ?? null;

  const cards = React.useMemo(() => {
    const accounts = Array.isArray(accountsQuery.data) ? accountsQuery.data : [];
    return accounts.filter((a) => a.type === AccountType.CREDIT_CARD && !a.closedOn);
  }, [accountsQuery.data]);

  if (settingsQuery.isLoading && !settings) {
    return <p className="text-sm text-slate-500">Loading notification settings…</p>;
  }
  if (!settings) {
    return (
      <p className="text-sm text-rose-600 dark:text-rose-400">
        Couldn&apos;t load notification settings. Refresh to try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ThisDeviceCard settings={settings} />
      <PreferencesCard settings={settings} />
      <CardMutesCard settings={settings} cards={cards} loans={loansQuery.data ?? []} />
      <DevicesCard settings={settings} />
    </div>
  );
}
