import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { type LinkComponent, LinkProvider } from '../LinkProvider';
import { Toaster } from '../Toast/Toast';

export interface RootProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** The app's link component (the router's `Link`): what an action's `href` renders, so it navigates without a reload. */
  linkComponent?: LinkComponent;
}

/**
 * Root is the top of every Dinero page tree.
 * It fills the viewport with bg-canvas, sets Figtree (font-text) and text-ink,
 * and mounts the Dinero Toaster once.
 * A server component wrapping children.
 */
export const Root = forwardRef<HTMLDivElement, RootProps>(
  ({ children, className, linkComponent, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('min-h-dvh pl-safe-left pr-safe-right bg-canvas font-text text-ink', className)}
        {...props}
      >
        <LinkProvider component={linkComponent}>
          {children}
          <Toaster />
        </LinkProvider>
      </div>
    );
  },
);

Root.displayName = 'Root';
