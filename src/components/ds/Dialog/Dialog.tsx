import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import React, { forwardRef, useRef, useState } from 'react';

import { cn } from '../cn';
import { SheetHandle } from '../Sheet/Sheet';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

const dialogSizeClasses: Record<DialogSize, string> = {
  sm: 'sm:max-w-dialog-sm',
  md: 'sm:max-w-dialog-md',
  lg: 'sm:max-w-dialog-lg',
  xl: 'sm:max-w-dialog-xl',
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
 * Visual shell for modals: on desktop it renders centered, radius-xl, shadow-dialog,
 * with × close button. On phone it renders as a bottom sheet with drag handle,
 * no × button, and swipe-down-to-close (RULES §5.6).
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
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      startYRef.current = e.clientY;
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const diff = e.clientY - startYRef.current;
      setDragOffset(diff > 0 ? diff : 0);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (dragOffset > 80) {
        onClose?.();
      }
      setDragOffset(0);
    };

    return (
      <div
        ref={ref}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          ...style,
        }}
        className={cn(
          'bg-surface flex flex-col overflow-hidden text-body text-ink border-line-soft max-h-dvh w-full',
          'rounded-t-ds-sheet shadow-sheet border-t',
          'sm:rounded-ds-xl sm:shadow-dialog sm:border',
          dialogSizeClasses[size],
          isDragging ? 'transition-none' : 'transition-transform duration-sheet ease-out',
          className,
        )}
        {...props}
      >
        {srTitle && !title && <span className="sr-only">{srTitle}</span>}

        <div
          data-testid="dialog-drag-area"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="select-none shrink-0"
        >
          {/* On phone: drag handle */}
          <div className="sm:hidden cursor-grab active:cursor-grabbing touch-none">
            <SheetHandle />
          </div>

          {(title || description || showClose) && (
            <div className="px-space-16 sm:px-space-20 pt-space-12 sm:pt-space-16 pb-space-8 sm:pb-space-10 flex items-start gap-space-12 shrink-0">
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
                  className="hidden sm:inline-flex text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                >
                  <X className="w-space-16 h-space-16" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        {children}
      </div>
    );
  },
);

DialogShell.displayName = 'DialogShell';

export interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 sm:px-space-20 py-space-10 overflow-y-auto flex flex-col gap-space-12 flex-1 touch-pan-y',
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
  /** Optional far-left destructive slot (e.g. "Delete rule") */
  leftAction?: React.ReactNode;
  /** Primary / confirming action on the right (rendered last) */
  primaryAction?: React.ReactNode;
  /** Secondary action on the right (rendered before primaryAction) */
  secondaryAction?: React.ReactNode;
}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  (
    {
      children,
      className,
      leftAction,
      primaryAction,
      secondaryAction,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 sm:px-space-20 py-space-12 border-t border-line-soft bg-sunken flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-space-8 shrink-0',
          className,
        )}
        {...props}
      >
        {leftAction && (
          <div className="order-last sm:order-first sm:mr-auto shrink-0">
            {leftAction}
          </div>
        )}
        {secondaryAction}
        {primaryAction}
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
  onClose?: () => void;
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
      onClose,
      ...props
    },
    ref,
  ) => {
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);
    const closeRef = useRef<HTMLButtonElement>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      startYRef.current = e.clientY;
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // fallback
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const diff = e.clientY - startYRef.current;
      setDragOffset(diff > 0 ? diff : 0);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (dragOffset > 80) {
        if (onClose) {
          onClose();
        } else {
          closeRef.current?.click();
        }
      }
      setDragOffset(0);
    };

    return (
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-scrim bg-scrim" />
        <div className="fixed inset-x-0 bottom-0 sm:inset-0 z-overlay flex flex-col sm:items-center sm:justify-center sm:p-space-16 pointer-events-none">
          <DialogPrimitive.Content
            ref={ref}
            style={{
              transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
              ...style,
            }}
            className={cn(
              'pointer-events-auto bg-surface flex flex-col overflow-hidden text-body text-ink border-line-soft focus:outline-none max-h-dvh w-full',
              'rounded-t-ds-sheet shadow-sheet border-t',
              'sm:rounded-ds-xl sm:shadow-dialog sm:border',
              dialogSizeClasses[size],
              isDragging ? 'transition-none' : 'transition-transform duration-sheet ease-out',
              className,
            )}
            {...props}
          >
            <DialogPrimitive.Close ref={closeRef} className="sr-only" aria-label="Close" />

            <div
              data-testid="dialog-drag-area"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="select-none shrink-0"
            >
              {/* On phone: drag handle */}
              <div className="sm:hidden cursor-grab active:cursor-grabbing touch-none">
                <SheetHandle />
              </div>

              {(title || description || showClose || srTitle) && (
                <div className="px-space-16 sm:px-space-20 pt-space-12 sm:pt-space-16 pb-space-8 sm:pb-space-10 flex items-start gap-space-12 shrink-0">
                  <div className="flex-1 min-w-0">
                    {title ? (
                      <DialogPrimitive.Title className="font-extrabold text-title text-ink leading-tight">
                        {title}
                      </DialogPrimitive.Title>
                    ) : srTitle ? (
                      <DialogPrimitive.Title className="sr-only">
                        {srTitle}
                      </DialogPrimitive.Title>
                    ) : (
                      <DialogPrimitive.Title className="sr-only">
                        Dialog
                      </DialogPrimitive.Title>
                    )}

                    {description ? (
                      <DialogPrimitive.Description className="text-label text-ink-3 mt-space-2">
                        {description}
                      </DialogPrimitive.Description>
                    ) : (
                      <DialogPrimitive.Description className="sr-only">
                        {typeof srTitle === 'string' ? srTitle : 'Dialog description'}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  {showClose && (
                    <DialogPrimitive.Close asChild>
                      <button
                        type="button"
                        aria-label="Close"
                        className="hidden sm:inline-flex text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                      >
                        <X className="w-space-16 h-space-16" aria-hidden="true" />
                      </button>
                    </DialogPrimitive.Close>
                  )}
                </div>
              )}
            </div>

            {children}
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    );
  },
);

DialogContent.displayName = 'DialogContent';
