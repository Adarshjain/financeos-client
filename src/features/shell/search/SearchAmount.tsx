'use client';

import React from 'react';

import { Amount } from '@/components/organisms/Amount/Amount';

/**
 * A transaction amount in a search row: "₹24,990", or "+₹46,800" in the money-in tone; "₹ —" while amounts are hidden.
 * `prefix` leads the amount ("You owe ₹44,319").
 */
export function SearchAmount({ amount, prefix }: { amount: number; prefix?: string }) {
  return <Amount value={amount} direction={amount > 0 ? 'credit' : 'debit'} prefix={prefix} className="whitespace-nowrap" />;
}
