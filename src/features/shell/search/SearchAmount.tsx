'use client';

import React from 'react';

import { CONCEAL_PLACEHOLDER, Text, useConcealed } from '@/components/ds';
import { formatAmount } from '@/features/accounts/list/accountsList';

/** A transaction amount in a search row: "₹24,990", or "+₹46,800" in the money-in tone; "₹ —" while amounts are hidden. */
export function SearchAmount({ amount }: { amount: number }) {
  const concealed = useConcealed();
  const credit = amount > 0;
  const abs = Math.abs(amount);
  const text = `${credit ? '+' : ''}₹${formatAmount(abs, Number.isInteger(abs) ? 0 : 2)}`;
  return (
    <Text variant="body-strong" tone={credit && !concealed ? 'positive' : 'ink'} className="whitespace-nowrap">
      {concealed ? CONCEAL_PLACEHOLDER : text}
    </Text>
  );
}
