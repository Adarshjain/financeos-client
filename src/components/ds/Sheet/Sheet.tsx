import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface SheetHandleProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SheetHandle = forwardRef<HTMLDivElement, SheetHandleProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(
          'w-space-40 h-space-4 rounded-ds-pill bg-line-handle mx-auto mt-space-8 shrink-0',
          className,
        )}
        {...props}
      />
    );
  },
);

SheetHandle.displayName = 'SheetHandle';

export interface SheetShellProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  srTitle?: string;
  showHandle?: boolean;
}

/**
 * Visual shell for phone bottom sheets: rounded top corners (radius-sheet),
 * drag handle, title and subtitle, scrolling body, sticky footer.
 */
export const SheetShell = forwardRef<HTMLDivElement, SheetShellProps>(
  (
    {
      children,
      className,
      title,
      subtitle,
      description,
      srTitle,
      showHandle = true,
      ...props
    },
    ref,
  ) => {
    const desc = subtitle ?? description;

    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface rounded-t-ds-sheet shadow-sheet flex flex-col overflow-hidden text-body text-ink border-t border-line-soft',
          className,
        )}
        {...props}
      >
        {srTitle && !title && <span className="sr-only">{srTitle}</span>}
        {showHandle && <SheetHandle />}

        {(title || desc) && (
          <div className="px-space-16 pt-space-12 pb-space-8 flex flex-col shrink-0">
            {title && (
              <div className="font-extrabold text-title text-ink leading-tight">
                {title}
              </div>
            )}
            {desc && (
              <div className="text-label text-ink-3 mt-space-2">{desc}</div>
            )}
          </div>
        )}

        {children}
      </div>
    );
  },
);

SheetShell.displayName = 'SheetShell';

export interface SheetBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: number | string;
}

export const SheetBody = forwardRef<HTMLDivElement, SheetBodyProps>(
  ({ children, className, style, maxHeight = 480, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          maxHeight,
          ...style,
        }}
        className={cn(
          'px-space-16 py-space-4 overflow-y-auto flex flex-col gap-space-12 flex-1',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

SheetBody.displayName = 'SheetBody';

export interface SheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SheetFooter = forwardRef<HTMLDivElement, SheetFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 py-space-12 border-t border-line-soft bg-sunken flex items-center gap-space-8 shrink-0',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

SheetFooter.displayName = 'SheetFooter';

/* Radix Dialog wrappers for accessible bottom-sheet modals */

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export interface SheetContentProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    'title'
  > {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  srTitle?: string;
  showHandle?: boolean;
}

export const SheetContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      children,
      className,
      style,
      title,
      subtitle,
      description,
      srTitle,
      showHandle = true,
      ...props
    },
    ref,
  ) => {
    const desc = subtitle ?? description;

    return (
      <SheetPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <DialogPrimitive.Content
          ref={ref}
          style={{
            maxHeight: '90%',
            ...style,
          }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-ds-sheet shadow-sheet flex flex-col overflow-hidden text-body text-ink border-t border-line-soft focus:outline-none',
            className,
          )}
          {...props}
        >
          {title ? (
            <DialogPrimitive.Title className="sr-only">
              {typeof title === 'string' ? title : 'Sheet'}
            </DialogPrimitive.Title>
          ) : srTitle ? (
            <DialogPrimitive.Title className="sr-only">
              {srTitle}
            </DialogPrimitive.Title>
          ) : null}

          <DialogPrimitive.Description className="sr-only">
            {typeof desc === 'string'
              ? desc
              : typeof title === 'string'
                ? title
                : 'Sheet description'}
          </DialogPrimitive.Description>

          {showHandle && <SheetHandle />}

          {(title || desc) && (
            <div className="px-space-16 pt-space-12 pb-space-8 flex flex-col shrink-0">
              {title && (
                <div className="font-extrabold text-title text-ink leading-tight">
                  {title}
                </div>
              )}
              {desc && (
                <div className="text-label text-ink-3 mt-space-2">{desc}</div>
              )}
            </div>
          )}

          {children}
        </DialogPrimitive.Content>
      </SheetPortal>
    );
  },
);

SheetContent.displayName = 'SheetContent';
