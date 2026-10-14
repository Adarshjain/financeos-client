import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional illustration element (e.g. OfflineIllustration) */
  illustration?: React.ReactNode;
  /** Primary headline (rendered in display font, screen-title style) */
  title?: React.ReactNode;
  /** Explanatory one-sentence description */
  description?: React.ReactNode;
  /** Action button or group of action buttons */
  action?: React.ReactNode;
  /** Compact single-line style for small panels or widget rows */
  compact?: boolean;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      children,
      className,
      illustration,
      title,
      description,
      action,
      compact = false,
      ...props
    },
    ref,
  ) => {
    if (compact || (!title && !illustration && !action)) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center justify-center text-center p-space-16 text-body text-ink-3',
            className,
          )}
          {...props}
        >
          {children ?? description}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center gap-space-8 px-space-20 py-space-40 text-ink-3 select-none',
          className,
        )}
        {...props}
      >
        {illustration && <div className="mb-space-4">{illustration}</div>}
        {title && (
          <h3 className="font-display font-bold text-screen-title text-ink m-0">
            {title}
          </h3>
        )}
        {description && (
          <p className="font-sans text-body text-ink-3 max-w-xs m-0">
            {description}
          </p>
        )}
        {children}
        {action && (
          <div className="mt-space-8 flex items-center justify-center gap-space-8 flex-wrap">
            {action}
          </div>
        )}
      </div>
    );
  },
);

EmptyState.displayName = 'EmptyState';

export function OfflineIllustration({ className }: { className?: string }) {
  return (
    <svg
      width="84"
      height="64"
      viewBox="0 0 84 64"
      aria-hidden="true"
      className={className}
    >
      <ellipse cx="44" cy="22" rx="26" ry="14" fill="var(--ds-line-soft)" />
      <circle
        cx="40"
        cy="44"
        r="16"
        fill="var(--ds-illus-gold)"
        stroke="var(--ds-illus-gold-edge)"
        strokeWidth="3"
      />
      <text
        x="40"
        y="50"
        textAnchor="middle"
        fontFamily="var(--ds-font-text),Figtree,sans-serif"
        fontWeight="800"
        fontSize="16"
        fill="var(--ds-warning-ink)"
      >
        ₹
      </text>
      <text
        x="62"
        y="12"
        fontFamily="var(--ds-font-text),Figtree,sans-serif"
        fontWeight="800"
        fontSize="11"
        fill="var(--ds-ink-4)"
      >
        z z
      </text>
    </svg>
  );
}
