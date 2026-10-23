'use client';

import React from 'react';

import { isAccountOfType } from '@/lib/account.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';

import { FnoTradeDialog } from './FnoTradeDialog';

/**
 * The top bar's + on the F&O tab: the form for a new trade. The broker accounts load on their own; the page
 * refreshes after the trade is saved. Mount it while the form should be open and close it from `onClose`.
 */
export function FnoAddDialog({ onClose }: { onClose: () => void }) {
  const { data: accounts = [], isPending } = useAccounts();
  const brokers = React.useMemo(() => accounts.filter(isAccountOfType(AccountType.BROKER)), [accounts]);
  // The form starts on the first broker, so it waits for the accounts instead of opening with none.
  if (isPending) return null;
  return <FnoTradeDialog brokers={brokers} onClose={onClose} />;
}
