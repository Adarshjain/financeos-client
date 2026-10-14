import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type DateGroupHeaderVariant = 'day' | 'month';

export interface DateGroupHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant of the date group header:
   * - 'day': Sticky header above each day's rows on phone lists: "12 Oct" in 800 with weekday in ink-3.
   * - 'month': Month band for desktop tables or section separations: "September 2026 · 61 transactions · out ₹1,05,219".
   */
  variant?: DateGroupHeaderVariant;
  /** Primary date label, e.g. "12 Oct" (day) or "September 2026" (month) */
  date?: React.ReactNode;
  /** Weekday label for day variant, e.g. "Mon" */
  weekday?: React.ReactNode;
  /** Summary or detail metadata for month variant, e.g. "61 transactions · out ₹1,05,219" */
  summary?: React.ReactNode;
  /** Whether the header sticks to top while its rows scroll (default: true for day, false for month) */
  sticky?: boolean;
  /** Whether to show a top border (default: true) */
  borderTop?: boolean;
  /** Whether to show a bottom border (default: false for day, true for month) */
  borderBottom?: boolean;
}

export const DateGroupHeader = forwardRef<HTMLDivElement, DateGroupHeaderProps>(
  (
    {
      variant = 'day',
      date,
      weekday,
      summary,
      sticky = variant === 'day',
      borderTop = true,
      borderBottom = variant === 'month',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    if (variant === 'month') {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-sunken px-space-14 py-space-6 text-overline uppercase text-ink-4 flex items-center justify-between select-none',
            sticky && 'sticky top-0 z-sticky',
            borderTop ? 'border-t border-line-soft' : 'border-t-0',
            borderBottom ? 'border-b border-line-soft' : 'border-b-0',
            className,
          )}
          {...props}
        >
          <span>
            {children ?? (
              <>
                {date}
                {summary && ` · ${summary}`}
              </>
            )}
          </span>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'bg-subtle px-space-14 py-space-6 text-label font-extrabold text-ink flex items-baseline gap-space-6 select-none',
          sticky && 'sticky top-0 z-sticky',
          borderTop ? 'border-t border-line-soft' : 'border-t-0',
          borderBottom ? 'border-b border-line-soft' : 'border-b-0',
          className,
        )}
        {...props}
      >
        <span>{date ?? children}</span>
        {weekday && (
          <span className="text-caption font-semibold text-ink-3">
            {weekday}
          </span>
        )}
      </div>
    );
  },
);

DateGroupHeader.displayName = 'DateGroupHeader';
