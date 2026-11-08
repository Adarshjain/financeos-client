'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { loadCardholders, loadCardSeenDates } from '@/features/accounts/accountActions';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

import { buildOldCard, holderOptions, primaryHolderId, seenHint, suggestOldCard } from './oldCard';

/**
 * The fields of "An old card" for one number on one account: the holder (the primary one unless picked), and the opened and
 * closed dates, prefilled from when the number was seen (editable; a date the user typed is never overwritten).
 * `fallback` is what the caller already knows about the number (a group's first and last mail) when nothing else was seen.
 */
export function useOldCard(input: {
  accountId: string | null;
  last4: string | null;
  isBank: boolean;
  today: string;
  fallback?: { firstSeen?: string | null; lastSeen?: string | null };
}) {
  const { accountId, last4, isBank, today, fallback } = input;
  const ready = Boolean(accountId) && last4 !== null && last4.length === 4;

  const holdersQuery = useQuery({
    queryKey: keys.accounts.cardholders(accountId ?? ''),
    queryFn: () => unwrapAction(loadCardholders(accountId ?? '')),
    enabled: Boolean(accountId),
  });
  const seenQuery = useQuery({
    queryKey: ['accounts', accountId, 'seen-dates', last4] as const,
    queryFn: () => unwrapAction(loadCardSeenDates(accountId ?? '', last4 ?? '')),
    enabled: ready,
  });

  const [picked, setPicked] = useState<{ key: string; cardholderId: string; issuedOn: string | null; closedOn: string | null }>({
    key: '',
    cardholderId: '',
    issuedOn: null,
    closedOn: null,
  });
  // Another account or number starts from its own prefill, and coming back to an earlier one does not bring old picks back.
  const key = `${accountId ?? ''}:${last4 ?? ''}`;
  if (picked.key !== key) setPicked({ key, cardholderId: '', issuedOn: null, closedOn: null });
  const mine = picked.key === key ? picked : { key, cardholderId: '', issuedOn: null, closedOn: null };

  const holders = holdersQuery.data ?? [];
  const seen = seenQuery.data ?? null;
  const cardholderId = mine.cardholderId || primaryHolderId(holders);
  const issuedOn = mine.issuedOn ?? seen?.firstSeen ?? fallback?.firstSeen ?? '';
  const closedOn = mine.closedOn ?? seen?.lastSeen ?? fallback?.lastSeen ?? '';
  const lastSeenOn = fallback?.lastSeen ?? seen?.lastSeen ?? null;

  const draft = { cardholderId: holders.length > 1 ? cardholderId : '', issuedOn, closedOn };
  return {
    holders,
    holderOptions: holderOptions(holders, isBank),
    showHolderPicker: holders.length > 1,
    cardholderId,
    issuedOn,
    closedOn,
    setCardholderId: (id: string) => setPicked({ ...mine, cardholderId: id }),
    setIssuedOn: (v: string) => setPicked({ ...mine, issuedOn: v }),
    setClosedOn: (v: string) => setPicked({ ...mine, closedOn: v }),
    hint: seen ? seenHint(seen) : null,
    /** Known once the account's cards have loaded; false until then. */
    suggested: holdersQuery.isSuccess && last4 !== null
      ? suggestOldCard({ cards: holders.flatMap((h) => h.cards ?? []), last4, lastSeenOn, today })
      : false,
    loading: holdersQuery.isLoading,
    /** The request body, or the errors to show under the dates. */
    build: () => buildOldCard(draft, last4 ?? '', today),
  };
}

export type OldCardState = ReturnType<typeof useOldCard>;
