'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { createContext, forwardRef, useCallback, useContext, useRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { useControllableState } from '../useControllableState';
import { useSheetDrag } from '../useSheetDrag';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';
export type DialogVariant = 'modal' | 'side-panel';
export type DialogBackground = 'surface' | 'canvas';

const dialogSizeClasses: Record<DialogSize, string> = {
  ['sm']: 'desk:max-w-container-sm',
  ['md']: 'desk:max-w-container-md',
  ['lg']: 'desk:max-w-container-lg',
  ['xl']: 'desk:max-w-container-xl',
};

export interface DialogHandleProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogHandle = forwardRef<HTMLDivElement, DialogHandleProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(
          'w-space-40 h-space-4 rounded-ds-pill bg-line-heavy mx-auto shrink-0',
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
          'px-space-16 desk:px-space-20 py-space-10 overflow-y-auto flex flex-col gap-space-12 flex-1 touch-pan-y',
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

export interface DialogAction {
  label: React.ReactNode;
  onSelect?: () => void;
  type?: 'button' | 'submit';
  form?: string;
  disabled?: boolean;
  loading?: boolean;
}

export interface DialogPrimaryAction extends DialogAction {
  destructive?: boolean;
}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Primary / confirming action (rendered last, far right on desktop) */
  primary?: DialogPrimaryAction;
  /** Secondary action (rendered before primary) */
  secondary?: DialogAction;
  /** Optional tertiary action (rendered first, far left) */
  tertiary?: DialogAction;
}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ children, className, primary, secondary, tertiary, ...props }, ref) => {
    const hasActions = Boolean(primary || secondary || tertiary);

    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 desk:px-space-20 py-space-8 desk:py-space-12 pb-safe-12 desk:pb-space-12 border-t border-line-soft bg-sunken shrink-0',
          className
        )}
        {...props}
      >
        {children}
        {hasActions && (
          <div className="grid grid-flow-col auto-cols-fr gap-space-8 desk:flex desk:justify-end">
            {tertiary && (
              <Button
                key="tertiary"
                variant="link"
                size="md"
                type={tertiary.type ?? 'button'}
                form={tertiary.form}
                disabled={tertiary.disabled}
                loading={tertiary.loading}
                onClick={tertiary.onSelect}
                className="w-full desk:w-auto flex items-center justify-center desk:px-space-8"
              >
                {tertiary.label}
              </Button>
            )}
            {secondary && (
              <Button
                key="secondary"
                variant="link"
                size="md"
                type={secondary.type ?? 'button'}
                form={secondary.form}
                disabled={secondary.disabled}
                loading={secondary.loading}
                onClick={secondary.onSelect}
                className="w-full desk:w-auto flex items-center justify-center desk:px-space-8"
              >
                {secondary.label}
              </Button>
            )}
            {primary && (
              <Button
                key="primary"
                variant={primary.destructive ? 'danger-filled' : 'primary'}
                size="md"
                type={primary.type ?? 'button'}
                form={primary.form}
                disabled={primary.disabled}
                loading={primary.loading}
                onClick={primary.onSelect}
                className="w-full desk:w-auto"
              >
                {primary.label}
              </Button>
            )}
          </div>
        )}
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
  primary?: DialogPrimaryAction;
  secondary?: DialogAction;
  tertiary?: DialogAction;
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
          'flex flex-col overflow-hidden font-text text-body text-ink border-line-soft max-h-dvh w-full',
          'rounded-t-ds-2xl shadow-up-2 border-t',
          variant === 'side-panel'
            ? 'desk:rounded-ds-lg desk:shadow-none desk:border desk:border-line desk:flex-1 desk:min-h-0 desk:max-h-full desk:w-full'
            : 'desk:rounded-ds-xl desk:shadow-level-3 desk:border',
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
          className="select-none shrink-0 touch-none"
        >
          {dismissible ? (
            <div className="desk:hidden cursor-grab active:cursor-grabbing touch-none py-space-8">
              <DialogHandle />
            </div>
          ) : null}

          {hasVisibleHeader && (
            <div className="px-space-16 desk:px-space-20 pt-space-12 desk:pt-space-16 pb-space-8 desk:pb-space-10 flex items-start gap-space-12 shrink-0">
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
                  className="hidden desk:inline-flex text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
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
  primary?: DialogPrimaryAction;
  secondary?: DialogAction;
  tertiary?: DialogAction;
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

const DialogVariantContext = createContext<{ variant: DialogVariant; open: boolean }>({
  variant: 'modal',
  open: true,
});

export interface DialogProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>, 'modal'> {
  /** `side-panel` is non-modal on desktop (no backdrop, the page behind stays usable); on phone it is a sheet with a backdrop. */
  variant?: DialogVariant;
}

export const Dialog = ({
  variant = 'modal',
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: DialogProps) => {
  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  return (
    <DialogVariantContext.Provider value={{ variant, open: isOpen }}>
      <DialogPrimitive.Root
        {...props}
        open={isOpen}
        onOpenChange={setIsOpen}
        modal={variant !== 'side-panel'}
      >
        {children}
      </DialogPrimitive.Root>
    </DialogVariantContext.Provider>
  );
};
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export interface DialogContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
  'title'
> {
  size?: DialogSize;
  background?: DialogBackground;
  title?: React.ReactNode;
  description?: React.ReactNode;
  showClose?: boolean;
  srTitle?: string;
  onClose?: () => void;
  primary?: DialogPrimaryAction;
  secondary?: DialogAction;
  tertiary?: DialogAction;
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
      onInteractOutside,
      onEscapeKeyDown,
      ...props
    },
    ref
  ) => {
    const { variant, open } = useContext(DialogVariantContext);
    const closeRef = useRef<HTMLButtonElement>(null);

    const handleClose = () => {
      closeRef.current?.click();
      onClose?.();
    };

    const { dragOffset, isDragging, dragProps, reset: resetDrag } = useSheetDrag({
      onClose: handleClose,
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

    // Side panel: the page behind stays usable, so a click or focus outside never closes it.
    const handleInteractOutside: DialogContentProps['onInteractOutside'] = (e) => {
      if (variant === 'side-panel') {
        e.preventDefault();
        return;
      }
      onInteractOutside?.(e);
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
        {variant === 'side-panel' ? (
          <div
            data-testid="dialog-backdrop"
            data-state={open ? 'open' : 'closed'}
            onClick={dismissible ? handleClose : undefined}
            className="desk:hidden fixed inset-0 z-backdrop bg-backdrop animate-in fade-in-0 duration-slow data-closed:animate-out data-closed:fade-out-0 data-closed:fill-mode-forwards data-closed:duration-slow"
          />
        ) : (
          <DialogPrimitive.Overlay className="fixed inset-0 z-backdrop bg-backdrop animate-in fade-in-0 duration-slow desk:duration-base data-closed:animate-out data-closed:fade-out-0 data-closed:fill-mode-forwards data-closed:duration-slow desk:data-closed:duration-base" />
        )}
        <DialogPrimitive.Content
          ref={ref}
          style={{ pointerEvents: 'none' }}
          onPointerDownOutside={handlePointerDownOutside}
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={handleEscapeKeyDown}
          className={cn(
            'group fixed inset-x-0 bottom-0 z-overlay flex flex-col focus:outline-none',
            'data-closed:animate-out data-closed:fill-mode-forwards data-closed:duration-slow desk:data-closed:duration-base',
            variant === 'side-panel'
              ? cn('desk:top-space-24 desk:right-space-24 desk:bottom-space-24 desk:left-auto desk:w-full', dialogSizeClasses[size])
              : 'desk:inset-0 desk:items-center desk:justify-center desk:p-space-16',
            // A side panel's className places it (the page sets its top offset); the modal's goes to the panel.
            variant === 'side-panel' && className
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
              'pointer-events-auto flex flex-col overflow-hidden font-text text-body text-ink border-line-soft max-h-dvh w-full',
              background === 'canvas' ? 'bg-canvas' : 'bg-surface',
              'rounded-t-ds-2xl shadow-up-2 border-t',
              variant === 'side-panel'
                ? 'desk:rounded-ds-lg desk:shadow-none desk:border desk:border-line desk:flex-1 desk:min-h-0 desk:max-h-full desk:w-full desk:slide-in-from-right desk:group-data-closed:slide-out-to-right'
                : 'desk:rounded-ds-xl desk:shadow-level-3 desk:border desk:zoom-in-95 desk:group-data-closed:zoom-out-95',
              dialogSizeClasses[size],
              'animate-in fade-in-0 slide-in-from-bottom desk:slide-in-from-bottom-0',
              'group-data-closed:animate-out group-data-closed:fade-out-0 group-data-closed:slide-out-to-bottom desk:group-data-closed:slide-out-to-bottom-0 group-data-closed:fill-mode-forwards group-data-closed:duration-slow desk:group-data-closed:duration-base',
              isDragging
                ? 'transition-none'
                : 'transition-transform duration-slow ease-out desk:duration-base',
              variant !== 'side-panel' && className
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
              onClose={handleClose}
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
          alternativeLabel
            ? {
                label: alternativeLabel,
                onSelect: onAlternative,
                disabled: isBusy,
              }
            : undefined
        }
        secondary={{
          label: cancelLabel,
          onSelect: onCancel || onClose,
          disabled: isBusy,
        }}
        primary={{
          label: confirmLabel,
          onSelect: handleConfirm,
          destructive: tone === 'danger',
          loading: isBusy,
          disabled: isConfirmDisabled,
        }}
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
            alternativeLabel
              ? {
                  label: alternativeLabel,
                  onSelect: handleAlternative,
                  disabled: isBusy,
                }
              : undefined
          }
          secondary={{
            label: cancelLabel,
            onSelect: handleCancel,
            disabled: isBusy,
          }}
          primary={{
            label: confirmLabel,
            onSelect: handleConfirm,
            destructive: tone === 'danger',
            loading: isBusy,
            disabled: isConfirmDisabled,
          }}
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
