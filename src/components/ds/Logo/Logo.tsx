import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * 'mark' renders the square mark alone; 'full' renders the mark and the "FinanceOS" wordmark.
   * @default 'mark'
   */
  variant?: 'mark' | 'full';
  /**
   * 'sm' 28px (chip size, used in Rail and AppBar) or 'md' 32px (control-md, used in auth pages).
   * @default 'md'
   */
  size?: 'sm' | 'md';
  /**
   * Symbol inside the mark square.
   * @default '₹'
   */
  symbol?: string;
}

/**
 * The FinanceOS mark: a ₹ on a brand rounded square, optionally followed by the wordmark "FinanceOS".
 * Used by AppBar, Rail, and sign-in, sign-up, and offline pages.
 */
export const Logo = forwardRef<HTMLSpanElement, LogoProps>(
  ({ variant = 'mark', size = 'md', symbol = '₹', className, ...props }, ref) => {
    const markClasses = cn(
      'rounded-ds-md bg-brand text-on-brand inline-flex items-center justify-center font-text font-extrabold text-heading shrink-0 select-none leading-none',
      size === 'sm' ? 'w-space-28 h-space-28' : 'w-control-md h-control-md',
    );

    if (variant === 'full') {
      return (
        <span
          ref={ref}
          className={cn(
            'inline-flex items-center gap-space-10 font-text font-extrabold text-heading text-ink select-none',
            className,
          )}
          {...props}
        >
          <span aria-hidden="true" className={markClasses}>
            {symbol}
          </span>
          <span>FinanceOS</span>
        </span>
      );
    }

    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={cn(markClasses, className)}
        {...props}
      >
        {symbol}
      </span>
    );
  },
);

Logo.displayName = 'Logo';
