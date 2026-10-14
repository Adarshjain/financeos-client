import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type SectionBandVariant = 'default' | 'danger';

export interface SectionBandProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Visual variant: default or danger */
  variant?: SectionBandVariant;
  /** Primary label / title of the section */
  title?: React.ReactNode;
  /** Optional trailing action or context */
  action?: React.ReactNode;
  /** Whether to show the top border (default: true) */
  borderTop?: boolean;
  /** Whether to show the bottom border (default: true) */
  borderBottom?: boolean;
}

export const SectionBand = forwardRef<HTMLDivElement, SectionBandProps>(
  (
    {
      children,
      className,
      variant = 'default',
      title,
      action,
      borderTop = true,
      borderBottom = true,
      ...props
    },
    ref,
  ) => {
    const isDanger = variant === 'danger';

    return (
      <div
        ref={ref}
        className={cn(
          'bg-sunken px-space-14 py-space-6 text-overline uppercase flex items-center justify-between select-none',
          borderTop ? 'border-t border-line-soft first:border-t-0' : 'border-t-0',
          borderBottom ? 'border-b border-line-soft' : 'border-b-0',
          isDanger ? 'text-danger' : 'text-ink-4',
          className,
        )}
        {...props}
      >
        <span>{title ?? children}</span>
        {action && <div className="normal-case shrink-0">{action}</div>}
      </div>
    );
  },
);

SectionBand.displayName = 'SectionBand';
