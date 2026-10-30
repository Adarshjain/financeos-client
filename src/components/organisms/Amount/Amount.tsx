'use client';

import React, { forwardRef } from 'react';

import { CONCEAL_PLACEHOLDER, useConcealed } from '@/components/ds/Conceal/Conceal';
import { Text, type TextProps } from '@/components/ds/Text/Text';
import { formatMoney, type MoneyOptions } from '@/lib/format';

export interface AmountProps extends Omit<TextProps, 'tone' | 'children'> {
  /** The amount. Its sign is ignored when `direction` is given: `direction` says which way the money went. */
  value: number;
  /** `credit`: "+" sign and the positive tone. `debit`: plain ink. Left out: the value's own sign, plain ink. */
  direction?: 'credit' | 'debit';
  /** Hide the amount ("₹ —", never green) even when the app's hide-amounts switch is off. It always hides while the switch is on. */
  concealed?: boolean;
  /** Passed to `formatMoney`; default 'auto' (paise only when there are some). */
  decimals?: MoneyOptions['decimals'];
  /** Passed to `formatMoney`; `false` leaves the ₹ off ("3,600.00"). */
  symbol?: boolean;
  /** Words before the amount ("You owe ₹44,319"); hidden amounts keep them. */
  prefix?: string;
}

/**
 * A money figure that owns its sign, its colour and its hiding: a credit reads "+₹46,800" in the positive tone,
 * a debit "₹24,990" in ink, and a hidden one "₹ —" in ink so the colour never gives the direction away.
 */
export const Amount = forwardRef<HTMLElement, AmountProps>(
  ({ value, direction, concealed, decimals = 'auto', symbol = true, prefix, variant = 'body-strong', className, ...props }, ref) => {
    const appConcealed = useConcealed();
    const hidden = Boolean(concealed) || appConcealed;
    const credit = direction === 'credit';
    const text = formatMoney(direction ? Math.abs(value) : value, { decimals, symbol, sign: credit ? 'always' : 'auto' });
    return (
      <Text
        ref={ref}
        variant={variant}
        tone={credit && !hidden ? 'positive' : 'ink'}
        className={className}
        {...props}
      >
        {`${prefix ? `${prefix} ` : ''}${hidden ? CONCEAL_PLACEHOLDER : text}`}
      </Text>
    );
  },
);

Amount.displayName = 'Amount';
