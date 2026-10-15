import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Illustration } from '../Illustration/Illustration';

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional variant: 'default' or 'offline' (auto-provides offline illustration and copy) */
  variant?: 'default' | 'offline';
  /** Optional illustration element (defaults to Illustration offline if variant="offline") */
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
      variant = 'default',
      illustration,
      title,
      description,
      action,
      compact = false,
      ...props
    },
    ref,
  ) => {
    const isOffline = variant === 'offline';
    const resolvedIllustration =
      illustration ?? (isOffline ? <Illustration variant="offline" /> : null);
    const resolvedTitle = title ?? (isOffline ? "You're offline" : null);
    const resolvedDescription =
      description ??
      (isOffline
        ? "FinanceOS needs a connection to show your money. We'll pick up where you left off."
        : null);

    if (compact || (!resolvedTitle && !resolvedIllustration && !action)) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center justify-center text-center p-space-16 text-body text-ink-3',
            className,
          )}
          {...props}
        >
          {children ?? resolvedDescription}
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
        {resolvedIllustration && (
          <div className="mb-space-4">{resolvedIllustration}</div>
        )}
        {resolvedTitle && (
          <h3 className="font-display font-bold text-screen-title text-ink m-0">
            {resolvedTitle}
          </h3>
        )}
        {resolvedDescription && (
          <p className="font-sans text-body text-ink-3 max-w-xs m-0">
            {resolvedDescription}
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
