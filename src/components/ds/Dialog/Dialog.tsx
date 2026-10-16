'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { forwardRef, useCallback, useRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { useControllableState } from '../useControllableState';
import { useSheetDrag } from '../useSheetDrag';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';
export type DialogVariant = 'modal' | 'side-panel';
export type DialogBackground = 'surface' | 'canvas';

const dialogSizeClasses: Record<DialogSize, string> = {
  ['sm']: 'lg:max-w-container-sm',
  ['md']: 'lg:max-w-container-md',
  ['lg']: 'lg:max-w-container-lg',
  ['xl']: 'lg:max-w-container-xl',
};

export interface DialogHandleProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogHandle = forwardRef<HTMLDivElement, DialogHandleProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(
          'w-space-40 h-space-4 rounded-ds-pill bg-line-heavy mx-auto mt-space-8 shrink-0',
          className
        )}
        {...props}
      />
    );
  }
);

DialogHandle.displayName = 'DialogHandle';

export interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 lg:px-space-20 py-space-10 overflow-y-auto flex flex-col gap-space-12 flex-1 touch-pan-y',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DialogBody.displayName = 'DialogBody';

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Primary / confirming action on the right (rendered last) */
  primary?: React.ReactNode;
  /** Secondary action on the right (rendered before primary) */
  secondary?: React.ReactNode;
  /** Optional far-left destructive action (e.g. "Delete rule") */
  tertiary?: React.ReactNode;
}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ children, className, primary, secondary, tertiary, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 lg:px-space-20 py-space-12 border-t border-line-soft bg-sunken flex items-center gap-space-8 shrink-0 justify-end',
          className
        )}
        {...props}
      >
        {tertiary && (
          <div className="mr-auto shrink-0 flex items-center">
            {tertiary}
          </div>
        )}
        {secondary && (
          <div className="flex-1 lg:flex-initial lg:shrink-0 flex items-center">
            {secondary}
          </div>
        )}
        {primary && (
          <div className="flex-1 lg:flex-initial lg:shrink-0 flex items-center">
            {primary}
          </div>
        )}
        {children}
      </div>
    );
  }
);

DialogFooter.displayName = 'DialogFooter';

export interface DialogPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  size?: DialogSize;
  variant?: DialogVariant;
  background?: DialogBackground;
  title?: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
  srTitle?: string;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
  dismissible?: boolean;
  dragProps?: Record<string, unknown>;
  isRadix?: boolean;
}

export const DialogPanel = forwardRef<HTMLDivElement, DialogPanelProps>(
  (
    {
      children,
      className,
      size = 'md',
      variant = 'modal',
      background = 'surface',
      title,
      description,
      onClose,
      showClose = true,
      srTitle,
      primary,
      secondary,
      tertiary,
      dismissible = true,
      dragProps,
      isRadix = false,
      ...props
    },
    ref
  ) => {
    const hasFooter = Boolean(primary || secondary || tertiary);
    const hasVisibleHeader = Boolean(title || description || showClose);

    return (
      <div
        ref={ref}
        className={cn(
          background === 'canvas' ? 'bg-canvas' : 'bg-surface',
          'flex flex-col overflow-hidden text-body text-ink border-line-soft max-h-dvh w-full',
          'rounded-t-ds-2xl shadow-up-2 border-t',
          variant === 'side-panel'
            ? 'lg:rounded-none lg:rounded-l-ds-xl lg:shadow-level-3 lg:border-y-0 lg:border-r-0 lg:border-l lg:h-full lg:max-h-full lg:w-full'
            : 'lg:rounded-ds-xl lg:shadow-level-3 lg:border',
          dialogSizeClasses[size],
          className
        )}
        {...props}
      >
        {srTitle && !title && (
          isRadix ? (
            <DialogPrimitive.Title className="sr-only">
              {srTitle}
            </DialogPrimitive.Title>
          ) : (
            <span className="sr-only">{srTitle}</span>
          )
        )}
        {srTitle && !description && isRadix && (
          <DialogPrimitive.Description className="sr-only">
            {srTitle}
          </DialogPrimitive.Description>
        )}

        <div
          data-testid="dialog-drag-area"
          {...(dismissible ? dragProps : {})}
          className="select-none shrink-0"
        >
          {dismissible ? (
            <div className="lg:hidden cursor-grab active:cursor-grabbing touch-none">
              <DialogHandle />
            </div>
          ) : null}

          {hasVisibleHeader && (
            <div className="px-space-16 lg:px-space-20 pt-space-12 lg:pt-space-16 pb-space-8 lg:pb-space-10 flex items-start gap-space-12 shrink-0">
              <div className="flex-1 min-w-0">
                {title && (
                  isRadix ? (
                    <DialogPrimitive.Title asChild>
                      <div className="font-extrabold text-title text-ink leading-tight">
                        {title}
                      </div>
                    </DialogPrimitive.Title>
                  ) : (
                    <div className="font-extrabold text-title text-ink leading-tight">
                      {title}
                    </div>
                  )
                )}
                {description && (
                  isRadix ? (
                    <DialogPrimitive.Description asChild>
                      <div className="text-label text-ink-3 mt-space-2">
                        {description}
                      </div>
                    </DialogPrimitive.Description>
                  ) : (
                    <div className="text-label text-ink-3 mt-space-2">
                      {description}
                    </div>
                  )
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

        {hasFooter && (
          <DialogFooter
            primary={primary}
            secondary={secondary}
            tertiary={tertiary}
          />
        )}
      </div>
    );
  }
);

DialogPanel.displayName = 'DialogPanel';

export interface DialogShellProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  size?: DialogSize;
  variant?: DialogVariant;
  background?: DialogBackground;
  title?: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
  srTitle?: string;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
  dismissible?: boolean;
}

export const DialogShell = forwardRef<HTMLDivElement, DialogShellProps>(
  (
    {
      style,
      className,
      onClose,
      dismissible = true,
      ...props
    },
    ref
  ) => {
    const { dragOffset, isDragging, dragProps } = useSheetDrag({
      onClose,
    });

    return (
      <DialogPanel
        ref={ref}
        onClose={onClose}
        dismissible={dismissible}
        dragProps={dragProps}
        style={{
          transform: dismissible && dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          ...style,
        }}
        className={cn(
          isDragging
            ? 'transition-none'
            : 'transition-transform duration-slow ease-out',
          className
        )}
        {...props}
      />
    );
  }
);

DialogShell.displayName = 'DialogShell';

/* Radix Dialog wrappers for accessible overlays */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export interface DialogContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
  'title'
> {
  size?: DialogSize;
  variant?: DialogVariant;
  background?: DialogBackground;
  title?: React.ReactNode;
  description?: React.ReactNode;
  showClose?: boolean;
  srTitle?: string;
  onClose?: () => void;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
  dismissible?: boolean;
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
      description,
      showClose = true,
      srTitle,
      onClose,
      primary,
      secondary,
      tertiary,
      dismissible = true,
      onPointerDownOutside,
      onEscapeKeyDown,
      ...props
    },
    ref
  ) => {
    const closeRef = useRef<HTMLButtonElement>(null);

    const { dragOffset, isDragging, dragProps, reset: resetDrag } = useSheetDrag({
      onClose: () => {
        if (onClose) {
          onClose();
        } else {
          closeRef.current?.click();
        }
      },
    });

    // The panel unmounts when the close animation ends: clear any drag offset then.
    const panelRef = useCallback(
      (node: HTMLDivElement | null) => {
        if (!node) resetDrag();
      },
      [resetDrag],
    );

    const handlePointerDownOutside: DialogContentProps['onPointerDownOutside'] = (
      e,
    ) => {
      if (!dismissible) {
        e.preventDefault();
        return;
      }
      onPointerDownOutside?.(e);
    };

    const handleEscapeKeyDown: DialogContentProps['onEscapeKeyDown'] = (e) => {
      if (!dismissible) {
        e.preventDefault();
        return;
      }
      onEscapeKeyDown?.(e);
    };

    return (
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-backdrop bg-backdrop animate-in fade-in-0 duration-slow lg:duration-base data-closed:animate-out data-closed:fade-out-0 data-closed:fill-mode-forwards data-closed:duration-slow lg:data-closed:duration-base" />
        <DialogPrimitive.Content
          ref={ref}
          style={{ pointerEvents: 'none' }}
          onPointerDownOutside={handlePointerDownOutside}
          onEscapeKeyDown={handleEscapeKeyDown}
          className={cn(
            'group fixed inset-x-0 bottom-0 z-overlay flex flex-col focus:outline-none',
            'data-closed:animate-out data-closed:fill-mode-forwards data-closed:duration-slow lg:data-closed:duration-base',
            variant === 'side-panel'
              ? 'lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:max-h-full'
              : 'lg:inset-0 lg:items-center lg:justify-center lg:p-space-16'
          )}
          {...props}
        >
          <div
            ref={panelRef}
            style={{
              transform:
                dismissible && dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
              ...style,
            }}
            className={cn(
              'pointer-events-auto flex flex-col overflow-hidden text-body text-ink border-line-soft max-h-dvh w-full',
              background === 'canvas' ? 'bg-canvas' : 'bg-surface',
              'rounded-t-ds-2xl shadow-up-2 border-t',
              variant === 'side-panel'
                ? 'lg:rounded-none lg:rounded-l-ds-xl lg:shadow-level-3 lg:border-y-0 lg:border-r-0 lg:border-l lg:h-full lg:max-h-full lg:w-full lg:slide-in-from-right lg:group-data-closed:slide-out-to-right'
                : 'lg:rounded-ds-xl lg:shadow-level-3 lg:border lg:zoom-in-95 lg:group-data-closed:zoom-out-95',
              dialogSizeClasses[size],
              'animate-in fade-in-0 slide-in-from-bottom lg:slide-in-from-bottom-0',
              'group-data-closed:animate-out group-data-closed:fade-out-0 group-data-closed:slide-out-to-bottom lg:group-data-closed:slide-out-to-bottom-0 group-data-closed:fill-mode-forwards group-data-closed:duration-slow lg:group-data-closed:duration-base',
              isDragging
                ? 'transition-none'
                : 'transition-transform duration-slow ease-out lg:duration-base',
              className
            )}
          >
            <DialogPrimitive.Close
              ref={closeRef}
              className="sr-only"
              aria-label="Close"
            />

            <DialogPanel
              size={size}
              variant={variant}
              background={background}
              title={title}
              description={description}
              showClose={showClose}
              srTitle={srTitle}
              onClose={onClose ? onClose : () => closeRef.current?.click()}
              primary={primary}
              secondary={secondary}
              tertiary={tertiary}
              dismissible={dismissible}
              dragProps={dragProps}
              isRadix
              className="border-0 rounded-none shadow-none bg-transparent"
            >
              {children}
            </DialogPanel>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }
);

DialogContent.displayName = 'DialogContent';

/* ConfirmDialog preset */

export type ConfirmDialogTone = 'danger' | 'default';

export interface ConfirmDialogShellProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
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
  previewLoading?: boolean;
  isCheckingImpact?: boolean;
  checkingMessage?: React.ReactNode;
  loadingText?: React.ReactNode;
  tone?: ConfirmDialogTone;
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
      previewLoading = false,
      isCheckingImpact = false,
      checkingMessage,
      loadingText = 'Loading…',
      tone = 'danger',
      size = 'sm',
      background = 'surface',
      showClose = true,
      onClose,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isBusy = Boolean(loading || confirmLoading);
    const isChecking = Boolean(previewLoading || isCheckingImpact);
    const isConfirmDisabled = Boolean(confirmDisabled || isChecking || isBusy);
    const effectiveLoadingMessage = checkingMessage ?? loadingText;

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
            variant={tone === 'danger' ? 'danger' : 'primary'}
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
          {isChecking ? (
            <div className="flex items-center gap-space-8 text-label text-ink-3 py-space-4">
              <Icon
                name="spinner"
                size="sm"
                className="animate-spin shrink-0"
              />
              <span>{effectiveLoadingMessage}</span>
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
  }
);

ConfirmDialogShell.displayName = 'ConfirmDialogShell';

export interface ConfirmDialogProps extends ConfirmDialogShellProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const ConfirmDialog = forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
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
      previewLoading = false,
      isCheckingImpact = false,
      checkingMessage,
      loadingText = 'Loading…',
      tone = 'danger',
      size = 'sm',
      background = 'surface',
      showClose = true,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useControllableState<boolean>({
      value: open,
      defaultValue: defaultOpen ?? false,
      onChange: onOpenChange,
    });

    const isBusy = Boolean(loading || confirmLoading);
    const isChecking = Boolean(previewLoading || isCheckingImpact);
    const isConfirmDisabled = Boolean(confirmDisabled || isChecking || isBusy);
    const effectiveLoadingMessage = checkingMessage ?? loadingText;

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
          ref={ref}
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
              variant={tone === 'danger' ? 'danger' : 'primary'}
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
            {isChecking ? (
              <div className="flex items-center gap-space-8 text-label text-ink-3 py-space-4">
                <Icon
                  name="spinner"
                  size="sm"
                  className="animate-spin shrink-0"
                />
                <span>{effectiveLoadingMessage}</span>
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
  }
);

ConfirmDialog.displayName = 'ConfirmDialog';
