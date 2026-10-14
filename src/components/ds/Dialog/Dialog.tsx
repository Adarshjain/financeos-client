import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

const dialogWidths: Record<DialogSize, number> = {
  sm: 440,
  md: 640,
  lg: 760,
  xl: 920,
};

export interface DialogShellProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  size?: DialogSize;
  title?: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
  srTitle?: string;
}

/**
 * Visual shell for desktop modals: centred, radius-xl, shadow-dialog,
 * with header, body, and sunken footer.
 */
export const DialogShell = forwardRef<HTMLDivElement, DialogShellProps>(
  (
    {
      children,
      className,
      style,
      size = 'md',
      title,
      description,
      onClose,
      showClose = true,
      srTitle,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        style={{
          width: '100%',
          maxWidth: dialogWidths[size],
          ...style,
        }}
        className={cn(
          'bg-surface rounded-ds-xl shadow-dialog flex flex-col overflow-hidden text-body text-ink border border-line-soft',
          className,
        )}
        {...props}
      >
        {srTitle && !title && <span className="sr-only">{srTitle}</span>}

        {(title || description || showClose) && (
          <div className="px-space-20 pt-space-16 pb-space-10 flex items-start gap-space-12 shrink-0">
            <div className="flex-1 min-w-0">
              {title && (
                <div className="font-extrabold text-title text-ink leading-tight">
                  {title}
                </div>
              )}
              {description && (
                <div className="text-label text-ink-3 mt-space-2">
                  {description}
                </div>
              )}
            </div>
            {showClose && onClose && (
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
              >
                <X className="w-space-16 h-space-16" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    );
  },
);

DialogShell.displayName = 'DialogShell';

export interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: number | string;
}

export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, className, style, maxHeight = 480, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          maxHeight,
          ...style,
        }}
        className={cn(
          'px-space-20 py-space-10 overflow-y-auto flex flex-col gap-space-12',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

DialogBody.displayName = 'DialogBody';

export interface DialogFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  leftAction?: React.ReactNode;
}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ children, className, leftAction, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-20 py-space-12 border-t border-line-soft bg-sunken flex items-center justify-end gap-space-8 shrink-0',
          className,
        )}
        {...props}
      >
        {leftAction && <div className="mr-auto">{leftAction}</div>}
        {children}
      </div>
    );
  },
);

DialogFooter.displayName = 'DialogFooter';

/* Radix Dialog wrappers for accessible overlays */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export interface DialogContentProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    'title'
  > {
  size?: DialogSize;
  title?: React.ReactNode;
  description?: React.ReactNode;
  showClose?: boolean;
  srTitle?: string;
}

export const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      children,
      className,
      style,
      size = 'md',
      title,
      description,
      showClose = true,
      srTitle,
      ...props
    },
    ref,
  ) => {
    return (
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim flex items-center justify-center p-space-16" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-16 pointer-events-none">
          <DialogPrimitive.Content
            ref={ref}
            style={{
              width: '100%',
              maxWidth: dialogWidths[size],
              ...style,
            }}
            className={cn(
              'pointer-events-auto bg-surface rounded-ds-xl shadow-dialog flex flex-col overflow-hidden text-body text-ink border border-line-soft focus:outline-none',
              className,
            )}
            {...props}
          >
            {title ? (
              <DialogPrimitive.Title className="sr-only">
                {typeof title === 'string' ? title : 'Dialog'}
              </DialogPrimitive.Title>
            ) : srTitle ? (
              <DialogPrimitive.Title className="sr-only">
                {srTitle}
              </DialogPrimitive.Title>
            ) : null}

            <DialogPrimitive.Description className="sr-only">
              {typeof description === 'string'
                ? description
                : typeof title === 'string'
                  ? title
                  : 'Dialog description'}
            </DialogPrimitive.Description>

            {(title || description || showClose) && (
              <div className="px-space-20 pt-space-16 pb-space-10 flex items-start gap-space-12 shrink-0">
                <div className="flex-1 min-w-0">
                  {title && (
                    <div className="font-extrabold text-title text-ink leading-tight">
                      {title}
                    </div>
                  )}
                  {description && (
                    <div className="text-label text-ink-3 mt-space-2">
                      {description}
                    </div>
                  )}
                </div>
                {showClose && (
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                    >
                      <X className="w-space-16 h-space-16" aria-hidden="true" />
                    </button>
                  </DialogPrimitive.Close>
                )}
              </div>
            )}

            {children}
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    );
  },
);

DialogContent.displayName = 'DialogContent';
