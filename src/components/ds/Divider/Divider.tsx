import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional short centred label, e.g. "or" between Continue with Google and email form.
   * Can also be passed as children.
   */
  label?: React.ReactNode;
}

/**
 * A 1px line rule, optionally with a short centred label in ink-4 caption.
 */
export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ label, children, className, ...props }, ref) => {
    const content = label ?? children;

    if (content) {
      return (
        <div
          ref={ref}
          role="separator"
          aria-orientation="horizontal"
          className={cn(
            'flex items-center gap-space-10 text-caption font-semibold font-text text-ink-4 w-full select-none',
            className,
          )}
          {...props}
        >
          <div className="h-px flex-1 bg-line" aria-hidden="true" />
          <span className="shrink-0">{content}</span>
          <div className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        className={cn('h-px w-full bg-line shrink-0', className)}
        {...props}
      />
    );
  },
);

Divider.displayName = 'Divider';
