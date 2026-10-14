import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type CalloutVariant = 'callout' | 'note' | 'warning-banner';

export interface CalloutProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Visual variant: callout (needs action), note (neutral info), or warning-banner */
  variant?: CalloutVariant;
  /** Optional bold title or headline prefix */
  title?: React.ReactNode;
  /** Optional inline action element or link */
  action?: React.ReactNode;
}

export const Callout = forwardRef<HTMLDivElement, CalloutProps>(
  (
    {
      children,
      className,
      variant = 'callout',
      title,
      action,
      ...props
    },
    ref,
  ) => {
    const variantStyles: Record<CalloutVariant, string> = {
      callout: 'bg-warning-tint text-warning-ink',
      note: 'bg-canvas text-ink-2',
      'warning-banner': 'bg-warning-tint text-warning-ink',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'text-label rounded-ds-lg px-space-12 py-space-10 flex items-start gap-space-8',
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && <b className="font-bold mr-space-4">{title}</b>}
          {children}
          {action && <span className="ml-space-4">{action}</span>}
        </div>
      </div>
    );
  },
);

Callout.displayName = 'Callout';

export const Note = forwardRef<HTMLDivElement, Omit<CalloutProps, 'variant'>>(
  (props, ref) => <Callout ref={ref} variant="note" {...props} />,
);

Note.displayName = 'Note';
