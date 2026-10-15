import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { forwardRef, useRef, useState } from 'react';

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
  onClose?: () => void;
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
      style,
      title,
      subtitle,
      description,
      srTitle,
      showHandle = true,
      onClose,
      ...props
    },
    ref,
  ) => {
    const desc = subtitle ?? description;
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
          'bg-surface rounded-t-ds-sheet shadow-sheet flex flex-col overflow-hidden text-body text-ink border-t border-line-soft max-h-dvh',
          isDragging ? 'transition-none' : 'transition-transform duration-sheet ease-out',
          className,
        )}
        {...props}
      >
        {srTitle && !title && <span className="sr-only">{srTitle}</span>}

        <div
          data-testid="sheet-drag-area"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="cursor-grab active:cursor-grabbing select-none shrink-0 touch-none"
        >
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
        </div>

        {children}
      </div>
    );
  },
);

SheetShell.displayName = 'SheetShell';

export interface SheetBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SheetBody = forwardRef<HTMLDivElement, SheetBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 py-space-4 overflow-y-auto flex flex-col gap-space-12 flex-1 touch-pan-y',
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
  onClose?: () => void;
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
      onClose,
      ...props
    },
    ref,
  ) => {
    const desc = subtitle ?? description;
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
      <SheetPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-scrim bg-scrim" />
        <DialogPrimitive.Content
          ref={ref}
          style={{
            transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
            ...style,
          }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-overlay bg-surface rounded-t-ds-sheet shadow-sheet flex flex-col overflow-hidden text-body text-ink border-t border-line-soft focus:outline-none max-h-dvh',
            isDragging ? 'transition-none' : 'transition-transform duration-sheet ease-out',
            className,
          )}
          {...props}
        >
          <DialogPrimitive.Close ref={closeRef} className="sr-only" aria-label="Close" />

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

          <div
            data-testid="sheet-drag-area"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="cursor-grab active:cursor-grabbing select-none shrink-0 touch-none"
          >
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
          </div>

          {children}
        </DialogPrimitive.Content>
      </SheetPortal>
    );
  },
);

SheetContent.displayName = 'SheetContent';
