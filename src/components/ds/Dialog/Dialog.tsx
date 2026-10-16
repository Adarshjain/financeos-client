'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { forwardRef, useRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { useControllableState } from '../useControllableState';
import { useSheetDrag } from '../useSheetDrag';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';
export type DialogVariant = 'modal' | 'side-panel';
export type DialogBackground = 'surface' | 'canvas';

const dialogSizeClasses: Record<DialogSize, string> = {
  ['sm']: 'lg:max-w-dialog-sm',
  ['md']: 'lg:max-w-dialog-md',
  ['lg']: 'lg:max-w-dialog-lg',
  ['xl']: 'lg:max-w-dialog-xl',
};

export interface DialogHandleProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogHandle = forwardRef<HTMLDivElement, DialogHandleProps>(
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

DialogHandle.displayName = 'DialogHandle';
export const SheetHandle = DialogHandle;

export interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 lg:px-space-20 py-space-10 overflow-y-auto flex flex-col gap-space-12 flex-1 touch-pan-y',
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
  /** Primary / confirming action on the right (rendered last) */
  primary?: React.ReactNode;
  /** Secondary action on the right (rendered before primary) */
  secondary?: React.ReactNode;
  /** Optional far-left destructive action (e.g. "Delete rule") */
  tertiary?: React.ReactNode;
}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  (
    {
      children,
      className,
      primary,
      secondary,
      tertiary,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 lg:px-space-20 py-space-12 border-t border-line-soft bg-sunken flex items-center gap-space-8 shrink-0 justify-end',
          className,
        )}
        {...props}
      >
        {tertiary && (
          <div className="mr-auto shrink-0 flex items-center [&>button]:h-control-xl lg:[&>button]:h-control-md [&>button]:text-body [&>button]:rounded-ds-lg lg:[&>button]:rounded-ds-md [&>button]:px-space-20 lg:[&>button]:px-space-12">
            {tertiary}
          </div>
        )}
        {secondary && (
          <div className="flex-1 lg:flex-initial lg:shrink-0 flex items-center [&>button]:w-full lg:[&>button]:w-auto [&>button]:h-control-xl lg:[&>button]:h-control-md [&>button]:text-body [&>button]:rounded-ds-lg lg:[&>button]:rounded-ds-md [&>button]:px-space-20 lg:[&>button]:px-space-12">
            {secondary}
          </div>
        )}
        {primary && (
          <div className="flex-1 lg:flex-initial lg:shrink-0 flex items-center [&>button]:w-full lg:[&>button]:w-auto [&>button]:h-control-xl lg:[&>button]:h-control-md [&>button]:text-body [&>button]:rounded-ds-lg lg:[&>button]:rounded-ds-md [&>button]:px-space-20 lg:[&>button]:px-space-12">
            {primary}
          </div>
        )}
        {children}
      </div>
    );
  },
);

DialogFooter.displayName = 'DialogFooter';

export interface DialogShellProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  size?: DialogSize;
  variant?: DialogVariant;
  background?: DialogBackground;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
  srTitle?: string;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
}

/**
 * Visual shell for modals: on desktop it renders centred, radius-xl, shadow-dialog,
 * with × close button. On phone it renders as a bottom sheet with drag handle,
 * no × button, and swipe-down-to-close (RULES §5.6).
 * Side panel slides in from the right on desktop and renders as a sheet on phone.
 */
export const DialogShell = forwardRef<HTMLDivElement, DialogShellProps>(
  (
    {
      children,
      className,
      style,
      size = 'md',
      variant = 'modal',
      background = 'surface',
      title,
      subtitle,
      description,
      onClose,
      showClose = true,
      srTitle,
      primary,
      secondary,
      tertiary,
      ...props
    },
    ref,
  ) => {
    const desc = subtitle ?? description;

    const { dragOffset, isDragging, dragProps } = useSheetDrag({
      onClose,
    });

    const hasFooterFromProps = Boolean(primary || secondary || tertiary);

    return (
      <div
        ref={ref}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          ...style,
        }}
        className={cn(
          background === 'canvas' ? 'bg-canvas' : 'bg-surface',
          'flex flex-col overflow-hidden text-body text-ink border-line-soft max-h-dvh w-full',
          'rounded-t-ds-sheet shadow-sheet border-t',
          variant === 'side-panel'
            ? 'lg:rounded-none lg:rounded-l-ds-xl lg:shadow-dialog lg:border-y-0 lg:border-r-0 lg:border-l lg:h-full lg:max-h-full lg:w-full'
            : 'lg:rounded-ds-xl lg:shadow-dialog lg:border',
          dialogSizeClasses[size],
          isDragging
            ? 'transition-none'
            : 'transition-transform duration-sheet ease-out',
          className,
        )}
        {...props}
      >
        {srTitle && !title && <span className="sr-only">{srTitle}</span>}

        <div
          data-testid="dialog-drag-area"
          {...dragProps}
          className="select-none shrink-0"
        >
          {/* On phone: drag handle */}
          <div className="lg:hidden cursor-grab active:cursor-grabbing touch-none">
            <DialogHandle />
          </div>

          {(title || desc || showClose) && (
            <div className="px-space-16 lg:px-space-20 pt-space-12 lg:pt-space-16 pb-space-8 lg:pb-space-10 flex items-start gap-space-12 shrink-0">
              <div className="flex-1 min-w-0">
                {title && (
                  <div className="font-extrabold text-title text-ink leading-tight">
                    {title}
                  </div>
                )}
                {desc && (
                  <div className="text-label text-ink-3 mt-space-2">{desc}</div>
                )}
              </div>
              {showClose && onClose && (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="hidden lg:inline-flex text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                >
                  <Icon name="close" size="md" />
                </button>
              )}
            </div>
          )}
        </div>

        {children}

        {hasFooterFromProps && (
          <DialogFooter
            primary={primary}
            secondary={secondary}
            tertiary={tertiary}
          />
        )}
      </div>
    );
  },
);

DialogShell.displayName = 'DialogShell';

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
  variant?: DialogVariant;
  background?: DialogBackground;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  showClose?: boolean;
  srTitle?: string;
  onClose?: () => void;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
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
      variant = 'modal',
      background = 'surface',
      title,
      subtitle,
      description,
      showClose = true,
      srTitle,
      onClose,
      primary,
      secondary,
      tertiary,
      ...props
    },
    ref,
  ) => {
    const desc = subtitle ?? description;
    const closeRef = useRef<HTMLButtonElement>(null);

    const { dragOffset, isDragging, dragProps } = useSheetDrag({
      onClose: () => {
        if (onClose) {
          onClose();
        } else {
          closeRef.current?.click();
        }
      },
    });

    const hasFooterFromProps = Boolean(primary || secondary || tertiary);

    return (
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-scrim bg-scrim animate-in fade-in-0 duration-base" />
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-overlay flex flex-col pointer-events-none',
            variant === 'side-panel'
              ? 'lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:max-h-full'
              : 'lg:inset-0 lg:items-center lg:justify-center lg:p-space-16',
          )}
        >
          <DialogPrimitive.Content
            ref={ref}
            style={{
              transform:
                dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
              ...style,
            }}
            className={cn(
              'pointer-events-auto flex flex-col overflow-hidden text-body text-ink border-line-soft focus:outline-none max-h-dvh w-full',
              background === 'canvas' ? 'bg-canvas' : 'bg-surface',
              'rounded-t-ds-sheet shadow-sheet border-t',
              variant === 'side-panel'
                ? 'lg:rounded-none lg:rounded-l-ds-xl lg:shadow-dialog lg:border-y-0 lg:border-r-0 lg:border-l lg:h-full lg:max-h-full lg:w-full lg:slide-in-from-right'
                : 'lg:rounded-ds-xl lg:shadow-dialog lg:border lg:zoom-in-95',
              dialogSizeClasses[size],
              'animate-in fade-in-0 duration-base slide-in-from-bottom lg:slide-in-from-bottom-0',
              isDragging
                ? 'transition-none'
                : 'transition-transform duration-sheet ease-out',
              className,
            )}
            {...props}
          >
            <DialogPrimitive.Close
              ref={closeRef}
              className="sr-only"
              aria-label="Close"
            />

            <div
              data-testid="dialog-drag-area"
              {...dragProps}
              className="select-none shrink-0"
            >
              {/* On phone: drag handle */}
              <div className="lg:hidden cursor-grab active:cursor-grabbing touch-none">
                <DialogHandle />
              </div>

              {(title || desc || showClose || srTitle) && (
                <div className="px-space-16 lg:px-space-20 pt-space-12 lg:pt-space-16 pb-space-8 lg:pb-space-10 flex items-start gap-space-12 shrink-0">
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

                    {desc ? (
                      <DialogPrimitive.Description className="text-label text-ink-3 mt-space-2">
                        {desc}
                      </DialogPrimitive.Description>
                    ) : (
                      <DialogPrimitive.Description className="sr-only">
                        {typeof srTitle === 'string'
                          ? srTitle
                          : 'Dialog description'}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  {showClose && (
                    <DialogPrimitive.Close asChild>
                      <button
                        type="button"
                        aria-label="Close"
                        className="hidden lg:inline-flex text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                      >
                        <Icon name="close" size="md" />
                      </button>
                    </DialogPrimitive.Close>
                  )}
                </div>
              )}
            </div>

            {children}

            {hasFooterFromProps && (
              <DialogFooter
                primary={primary}
                secondary={secondary}
                tertiary={tertiary}
              />
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    );
  },
);

DialogContent.displayName = 'DialogContent';

/* ConfirmDialog preset for destructive confirmations */

export interface ConfirmDialogShellProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  impact?: React.ReactNode[];
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  alternativeLabel?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  onAlternative?: () => void;
  loading?: boolean;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  isCheckingImpact?: boolean;
  checkingMessage?: React.ReactNode;
  size?: DialogSize;
  background?: DialogBackground;
  showClose?: boolean;
  onClose?: () => void;
}

export const ConfirmDialogShell = forwardRef<
  HTMLDivElement,
  ConfirmDialogShellProps
>(
  (
    {
      title,
      description,
      impact,
      confirmLabel,
      cancelLabel = 'Cancel',
      alternativeLabel,
      onConfirm,
      onCancel,
      onAlternative,
      loading = false,
      confirmLoading = false,
      confirmDisabled = false,
      isCheckingImpact = false,
      checkingMessage = 'Checking what will be affected…',
      size = 'sm',
      background = 'surface',
      showClose = true,
      onClose,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const isBusy = Boolean(loading || confirmLoading);
    const isConfirmDisabled = Boolean(
      confirmDisabled || isCheckingImpact || isBusy,
    );

    const handleConfirm = () => {
      if (isConfirmDisabled) return;
      onConfirm?.();
    };

    return (
      <DialogShell
        ref={ref}
        size={size}
        background={background}
        title={title}
        description={description}
        showClose={showClose}
        onClose={onCancel || onClose}
        tertiary={
          alternativeLabel ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isBusy}
              onClick={onAlternative}
            >
              {alternativeLabel}
            </Button>
          ) : undefined
        }
        secondary={
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            onClick={onCancel || onClose}
          >
            {cancelLabel}
          </Button>
        }
        primary={
          <Button
            type="button"
            variant="danger-filled"
            loading={isBusy}
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        }
        className={cn('w-full', className)}
        {...props}
      >
        <DialogBody className="space-y-space-12">
          {isCheckingImpact ? (
            <div className="flex items-center gap-space-8 text-label text-ink-3 py-space-4">
              <Icon name="spinner" size="sm" className="animate-spin shrink-0" />
              <span>{checkingMessage}</span>
            </div>
          ) : impact && impact.length > 0 ? (
            <ul className="list-disc pl-space-16 space-y-space-6 text-label text-ink-2">
              {impact.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : null}

          {children}
        </DialogBody>
      </DialogShell>
    );
  },
);

ConfirmDialogShell.displayName = 'ConfirmDialogShell';

export interface ConfirmDialogProps extends ConfirmDialogShellProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  impact,
  confirmLabel,
  cancelLabel = 'Cancel',
  alternativeLabel,
  onConfirm,
  onCancel,
  onAlternative,
  loading = false,
  confirmLoading = false,
  confirmDisabled = false,
  isCheckingImpact = false,
  checkingMessage = 'Checking what will be affected…',
  size = 'sm',
  background = 'surface',
  showClose = true,
  children,
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });

  const isBusy = Boolean(loading || confirmLoading);
  const isConfirmDisabled = Boolean(
    confirmDisabled || isCheckingImpact || isBusy,
  );

  const handleCancel = () => {
    onCancel?.();
    setIsOpen(false);
  };

  const handleAlternative = () => {
    onAlternative?.();
    setIsOpen(false);
  };

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirm?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      ) : null}
      <DialogContent
        size={size}
        background={background}
        title={title}
        description={description}
        showClose={showClose}
        onClose={handleCancel}
        className={className}
        tertiary={
          alternativeLabel ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isBusy}
              onClick={handleAlternative}
            >
              {alternativeLabel}
            </Button>
          ) : undefined
        }
        secondary={
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            onClick={handleCancel}
          >
            {cancelLabel}
          </Button>
        }
        primary={
          <Button
            type="button"
            variant="danger-filled"
            loading={isBusy}
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        }
        {...props}
      >
        <DialogBody className="space-y-space-12">
          {isCheckingImpact ? (
            <div className="flex items-center gap-space-8 text-label text-ink-3 py-space-4">
              <Icon name="spinner" size="sm" className="animate-spin shrink-0" />
              <span>{checkingMessage}</span>
            </div>
          ) : impact && impact.length > 0 ? (
            <ul className="list-disc pl-space-16 space-y-space-6 text-label text-ink-2">
              {impact.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : null}

          {children}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

ConfirmDialog.displayName = 'ConfirmDialog';
