import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Toaster } from '../Toast/Toast';

export interface RootProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * Root is the top of every Dinero page tree.
 * It fills the viewport with bg-canvas, sets Figtree (font-text) and text-ink,
 * and mounts the Dinero Toaster once.
 * A server component wrapping children.
 */
export const Root = forwardRef<HTMLDivElement, RootProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('min-h-dvh bg-canvas font-text text-ink', className)}
        {...props}
      >
        {children}
        <Toaster />
      </div>
    );
  },
);

Root.displayName = 'Root';
