import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Dialog, type DialogAction } from '../Dialog/Dialog';

export interface PageFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The confirming action, far right ("Save", "Create dashboard"). */
  primary?: DialogAction;
  /** Cancel (ghost), before the primary. */
  secondary?: DialogAction;
  /** Docks the bar to the bottom of the viewport while the page scrolls (on a phone full-bleed, over the page's side padding). Default: it sits at the end of the page. */
  sticky?: boolean;
  /**
   * `band` (default): the Dialog footer band (sunken background, top border, padding) at every width.
   * `plain`: from desk up, no background, top border or padding, and not docked; the buttons sit right-aligned at the end of the column.
   * The phone form is unchanged (owner, 2026-11-04).
   */
  variant?: 'band' | 'plain';
}

/**
 * PageFooter: the one bottom action bar of a create or edit page (new dashboard, report editor, import wizard).
 * The Dialog footer on a page: Cancel (ghost) and the primary at the right; full width, side by side, on a phone.
 * Variants: `band` (default) and `plain` (no band from desk up, for a page whose column ends in its actions).
 */
export const PageFooter = forwardRef<HTMLDivElement, PageFooterProps>(
  ({ primary, secondary, sticky = false, variant = 'band', className, children, ...props }, ref) => (
    <Dialog.Footer
      ref={ref}
      primary={primary}
      secondary={secondary}
      className={cn(
        sticky && 'sticky bottom-0 z-sticky max-desk:-mx-space-16 max-desk:mt-auto max-desk:bg-surface',
        variant === 'plain' && 'desk:static desk:bg-transparent desk:border-t-0 desk:p-0',
        className,
      )}
      {...props}
    >
      {children}
    </Dialog.Footer>
  ),
);

PageFooter.displayName = 'PageFooter';
