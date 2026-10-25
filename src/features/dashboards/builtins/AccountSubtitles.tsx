'use client';

// The subtitles that need the account list: a picked card's name, an account's type. Plain text, since the
// frame's Widget header styles the line.

import React from 'react';

import { accountTypeLabel } from '@/features/accounts/form/ds/accountFormModel';
import { useAccounts } from '@/lib/query/hooks/useAccounts';

import { accountTypeText, cardNameText } from './subtitles';

/** A card-scoped widget's subtitle: that card's name ("One card" until the list loads or when it is gone). */
export function CardNameSubtitle({ accountId }: { accountId: string }) {
  const { data: accounts } = useAccounts();
  return <>{cardNameText(accounts, accountId)}</>;
}

/** The account tile's subtitle: the account's type; "Account" until the list loads. */
export function AccountTypeSubtitle({ accountId }: { accountId: string }) {
  const { data: accounts } = useAccounts();
  return <>{accountTypeText(accounts, accountId, accountTypeLabel)}</>;
}
