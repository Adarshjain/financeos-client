import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export const Kbd = forwardRef<HTMLElement, KbdProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center px-space-6 py-space-2 rounded-ds-xs',
          'border border-b-2 border-line-strong bg-surface',
          'font-text font-bold text-caption leading-none select-none whitespace-nowrap',
          'text-ink-2',
          className,
        )}
        {...props}
      >
        {children}
      </kbd>
    );
  },
);

Kbd.displayName = 'Kbd';
