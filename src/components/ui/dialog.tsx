'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

interface DialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean;
  srTitle?: string;
}

// Lets DialogFooter tell its DialogContent that a secondary (dismiss-style)
// action exists, so the X close button can be dropped as redundant.
const DialogSecondaryActionContext = React.createContext<
  ((hasSecondary: boolean) => void) | null
>(null);

function DialogContent({
  className,
  children,
  showCloseButton = true,
  srTitle,
  onOpenAutoFocus,
  ref: forwardedRef,
  ...props
}: DialogContentProps) {
  const contentRef = React.useRef<React.ElementRef<typeof DialogPrimitive.Content> | null>(null);
  const [footerHasSecondary, setFooterHasSecondary] = React.useState(false);

  const setRefs = React.useCallback(
    (node: React.ElementRef<typeof DialogPrimitive.Content> | null) => {
      contentRef.current = node;
      if (!forwardedRef) return;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else (forwardedRef as React.MutableRefObject<React.ElementRef<typeof DialogPrimitive.Content> | null>).current = node;
    },
    [forwardedRef],
  );

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={setRefs}
        data-slot="dialog-content"
        tabIndex={-1}
        className={cn(
          // The content element is the scroll container: height is driven by the
          // content, and DialogFooter stays sticky even when a <form> wraps
          // body + footer (sticky resolves against this scrolling ancestor).
          // Mobile: bottom sheet, 4px inset, capped at full screen
          'fixed bottom-1 left-1 right-1 z-50 flex flex-col gap-0 p-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-h-[calc(100dvh-8px)] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom rounded-lg',
          // Desktop: Centered dialog style
          'sm:max-h-dvh sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:max-w-lg sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
          className,
        )}
        onOpenAutoFocus={(e) => {
          // Let callers run custom logic first.
          onOpenAutoFocus?.(e);
          if (e.defaultPrevented) return;

          // Prevent Radix from immediately focusing the first focusable element.
          // Some browsers (notably on mobile) will open a native <select> picker when focused.
          e.preventDefault();

          // Re-focus after the open animation/layout settles.
          window.setTimeout(() => {
            const root = contentRef.current;
            if (!root) return;

            // Prefer focusing "safe" elements that won't pop native pickers.
            const preferred = root.querySelector<HTMLElement>(
              'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
            );
            const fallbackSelect = root.querySelector<HTMLElement>('select:not([disabled])');

            (preferred ?? fallbackSelect ?? root).focus?.();
          }, 0);
        }}
        {...props}
      >
        {srTitle && (
          <DialogPrimitive.Title className="sr-only">
            {srTitle}
          </DialogPrimitive.Title>
        )}
        {showCloseButton && !footerHasSecondary && (
          // Zero-height sticky rail so the close button stays visible while the
          // content element scrolls (plain `absolute` would scroll away).
          <div className="sticky top-0 z-20 h-0 shrink-0">
            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
        )}
        <DialogSecondaryActionContext.Provider value={setFooterHasSecondary}>
          {children}
        </DialogSecondaryActionContext.Provider>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'shrink-0 flex flex-col gap-1.5 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 text-center sm:text-left pr-10',
        className,
      )}
      {...props}
    />
  );
}

function DialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn('px-4 py-4 sm:px-6', className)}
      {...props}
    />
  );
}

export type DialogFooterAction = {
  label: string;
  onClick?: () => void | Promise<void>;
  variant?: ButtonProps['variant'];
  disabled?: boolean;
  type?: 'button' | 'submit';
  form?: string;
};

export interface DialogFooterProps {
  primaryAction: DialogFooterAction;
  secondaryAction?: DialogFooterAction;
  className?: string;
}

function DialogFooter({
  primaryAction,
  secondaryAction,
  className,
}: DialogFooterProps) {
  const [running, setRunning] = React.useState(false);

  const reportSecondary = React.useContext(DialogSecondaryActionContext);
  const hasSecondary = !!secondaryAction;
  React.useEffect(() => {
    reportSecondary?.(hasSecondary);
    return () => reportSecondary?.(false);
  }, [reportSecondary, hasSecondary]);

  const handlePrimaryClick = async () => {
    if (running) return;
    if (!primaryAction.onClick) return;

    // Errors are the caller's to handle (toast etc.); surface anything that
    // escapes instead of silently discarding it, without turning it into an
    // unhandled rejection from a fire-and-forget event handler.
    try {
      const res = primaryAction.onClick();
      if (res && typeof (res as Promise<void>).then === 'function') {
        setRunning(true);
        try {
          await res;
        } finally {
          setRunning(false);
        }
      }
    } catch (error) {
      console.error('Dialog primary action failed:', error);
    }
  };

  const secondaryVariant = secondaryAction?.variant ?? 'outline';
  const primaryVariant = primaryAction.variant ?? 'default';

  const secondaryDisabled = secondaryAction?.disabled || running;
  const primaryDisabled = primaryAction.disabled || running;

  const secondaryBtn = secondaryAction ? (
    secondaryAction.onClick ? (
      <Button
        key="secondary"
        type={secondaryAction.type ?? 'button'}
        variant={secondaryVariant}
        disabled={secondaryDisabled}
        form={secondaryAction.form}
        onClick={secondaryAction.onClick}
        className="w-full sm:w-auto"
      >
        {secondaryAction.label}
      </Button>
    ) : (
      <DialogPrimitive.Close key="secondary" asChild>
        <Button
          type={secondaryAction.type ?? 'button'}
          variant={secondaryVariant}
          disabled={secondaryDisabled}
          form={secondaryAction.form}
          className="w-full sm:w-auto"
        >
          {secondaryAction.label}
        </Button>
      </DialogPrimitive.Close>
    )
  ) : null;

  const primaryBtn = (
    <Button
      key="primary"
      type={primaryAction.type ?? 'button'}
      variant={primaryVariant}
      disabled={primaryDisabled}
      form={primaryAction.form}
      onClick={primaryAction.onClick ? handlePrimaryClick : undefined}
      className="w-full sm:w-auto"
    >
      {primaryAction.label}
    </Button>
  );

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'sticky bottom-0 z-10 mt-auto border-t border-slate-100 dark:border-slate-800 bg-background px-4 py-3 sm:px-6 sm:py-4',
        secondaryAction
          ? 'grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:justify-end sm:gap-2'
          : 'grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:justify-end sm:gap-2',
        className,
      )}
    >
      {secondaryBtn}
      {primaryBtn}
    </div>
  );
}

function DialogTitle({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="dialog-title"
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
