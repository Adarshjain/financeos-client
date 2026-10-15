import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type SectionHeaderVariant = 'date' | 'band' | 'month' | 'danger';

export interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Variant of the header: date (sticky on phone), band, month, or danger */
  variant?: SectionHeaderVariant;
  /** Primary label text (e.g. "12 Oct", "Basics", "September 2026", "Delete account") */
  label?: React.ReactNode;
  /** Optional meta text (e.g. weekday "Mon" for date, or summary "61 transactions · out ₹1,05,219" for month) */
  meta?: React.ReactNode;
  /** Whether the header is sticky (default true for variant='date', false for others) */
  sticky?: boolean;
  /** Optional border-top toggle (default: true) */
  borderTop?: boolean;
}

/**
 * SectionHeader: The header that starts a section inside a list, card or sheet.
 * Variants:
 * - date: sticky day header on phone lists ("12 Oct" in 800 with weekday in ink-3 on bg-subtle, z-sticky)
 * - band: form section in a sheet or card, overline caption in ink-4 on bg-sunken
 * - month: desktop list band ("September 2026 · 61 transactions · out ₹1,05,219")
 * - danger: band that closes an edit sheet (Delete account), danger overline caption
 */
export const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(
  (
    {
      className,
      children,
      variant = 'band',
      label,
      meta,
      sticky,
      borderTop = true,
      ...props
    },
    ref,
  ) => {
    const primaryLabel = label ?? children;

    if (variant === 'date') {
      const isSticky = sticky ?? true;
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-baseline gap-space-6 py-space-6 px-space-14 bg-subtle border-b border-line-soft font-text text-label font-extrabold text-ink select-none',
            !borderTop && 'border-t-0',
            isSticky && 'sticky top-0 z-sticky',
            className,
          )}
          {...props}
        >
          <span>{primaryLabel}</span>
          {meta ? (
            <span className="font-semibold text-ink-3">{meta}</span>
          ) : null}
        </div>
      );
    }

    const isDanger = variant === 'danger';

    return (
      <div
        ref={ref}
        className={cn(
          'font-text text-overline font-extrabold uppercase py-space-6 px-space-14 bg-sunken border-b border-line-soft select-none',
          borderTop && 'border-t',
          isDanger ? 'text-danger' : 'text-ink-4',
          className,
        )}
        {...props}
      >
        <span>{primaryLabel}</span>
        {meta ? <span> · {meta}</span> : null}
      </div>
    );
  },
);

SectionHeader.displayName = 'SectionHeader';
