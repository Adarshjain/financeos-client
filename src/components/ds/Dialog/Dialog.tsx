'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { forwardRef, useRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { SectionHeader } from '../SectionHeader/SectionHeader';
import { useIsPhone } from '../useMediaQuery';
import { useSheetDrag } from '../useSheetDrag';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';
export type DialogVariant = 'modal' | 'side-panel';

const dialogSizeClasses: Record<DialogSize, string> = {
  sm: 'sm:max-w-dialog-sm',
  md: 'sm:max-w-dialog-md',
  lg: 'sm:max-w-dialog-lg',
  xl: 'sm:max-w-dialog-xl',
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
  /** Primary / confirming action on the right (rendered last) */
  primary?: React.ReactNode;
  primaryAction?: React.ReactNode;
  /** Secondary action on the right (rendered before primary) */
  secondary?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** Optional far-left destructive action (e.g. "Delete rule") */
  tertiary?: React.ReactNode;
  tertiaryAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  isPhone?: boolean;
}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  (
    {
      children,
      className,
      primary,
      primaryAction,
      secondary,
      secondaryAction,
      tertiary,
      tertiaryAction,
      leftAction,
      isPhone = false,
      ...props
    },
    ref,
  ) => {
    const prim = primary ?? primaryAction;
    const sec = secondary ?? secondaryAction;
    const tert = tertiary ?? tertiaryAction ?? leftAction;

    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 sm:px-space-20 py-space-12 border-t border-line-soft bg-sunken flex items-center gap-space-8 shrink-0',
          isPhone ? 'justify-stretch' : 'justify-end',
          className,
        )}
        {...props}
      >
        {!isPhone && tert && <div className="mr-auto shrink-0">{tert}</div>}
        {sec && <div className={cn(isPhone && 'flex-1')}>{sec}</div>}
        {prim && <div className={cn(isPhone && 'flex-1')}>{prim}</div>}
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
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
  srTitle?: string;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  tertiaryAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  tertiaryLabel?: string;
  forcePhone?: boolean;
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
      title,
      subtitle,
      description,
      onClose,
      showClose = true,
      srTitle,
      primary,
      secondary,
      tertiary,
      primaryAction,
      secondaryAction,
      tertiaryAction,
      leftAction,
      tertiaryLabel,
      forcePhone,
      ...props
    },
    ref,
  ) => {
    const isPhoneDevice = useIsPhone();
    const isPhone = forcePhone !== undefined ? forcePhone : isPhoneDevice;
    const desc = subtitle ?? description;
    const prim = primary ?? primaryAction;
    const sec = secondary ?? secondaryAction;
    const tert = tertiary ?? tertiaryAction ?? leftAction;

    const { dragOffset, isDragging, dragProps } = useSheetDrag({
      onClose,
    });

    const hasFooterFromProps = Boolean(prim || sec || (!isPhone && tert));

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
          variant === 'side-panel'
            ? 'sm:rounded-none sm:rounded-l-ds-xl sm:shadow-dialog sm:border-y-0 sm:border-r-0 sm:border-l sm:h-full sm:max-h-full sm:w-full'
            : 'sm:rounded-ds-xl sm:shadow-dialog sm:border',
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
          <div className="sm:hidden cursor-grab active:cursor-grabbing touch-none">
            <DialogHandle />
          </div>

          {(title || desc || showClose) && (
            <div className="px-space-16 sm:px-space-20 pt-space-12 sm:pt-space-16 pb-space-8 sm:pb-space-10 flex items-start gap-space-12 shrink-0">
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
                  className="hidden sm:inline-flex text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                >
                  <Icon name="close" size="md" />
                </button>
              )}
            </div>
          )}
        </div>

        {children}

        {isPhone && tert && (
          <div className="mt-auto pt-space-16 pb-space-8 shrink-0">
            <SectionHeader
              variant="danger"
              label={
                tertiaryLabel ||
                (typeof tert === 'string'
                  ? tert
                  : typeof title === 'string'
                    ? title
                    : 'Delete')
              }
              className="-mx-space-16 sm:-mx-space-20 mb-space-12"
            />
            <div className="px-space-16">
              {React.isValidElement(tert) ? (
                React.cloneElement(
                  tert as React.ReactElement<{
                    className?: string;
                    size?: string;
                    variant?: string;
                  }>,
                  {
                    className: cn(
                      'w-full',
                      (tert.props as { className?: string }).className,
                    ),
                    size: 'xl',
                    variant:
                      (tert.props as { variant?: string }).variant ||
                      'danger-filled',
                  },
                )
              ) : (
                <Button variant="danger-filled" size="xl" className="w-full">
                  {tert}
                </Button>
              )}
            </div>
          </div>
        )}

        {hasFooterFromProps && (
          <DialogFooter
            primary={prim}
            secondary={sec}
            tertiary={!isPhone ? tert : undefined}
            isPhone={isPhone}
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
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  showClose?: boolean;
  srTitle?: string;
  onClose?: () => void;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  tertiary?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  tertiaryAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  tertiaryLabel?: string;
  forcePhone?: boolean;
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
      title,
      subtitle,
      description,
      showClose = true,
      srTitle,
      onClose,
      primary,
      secondary,
      tertiary,
      primaryAction,
      secondaryAction,
      tertiaryAction,
      leftAction,
      tertiaryLabel,
      forcePhone,
      ...props
    },
    ref,
  ) => {
    const isPhoneDevice = useIsPhone();
    const isPhone = forcePhone !== undefined ? forcePhone : isPhoneDevice;
    const desc = subtitle ?? description;
    const prim = primary ?? primaryAction;
    const sec = secondary ?? secondaryAction;
    const tert = tertiary ?? tertiaryAction ?? leftAction;
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

    const hasFooterFromProps = Boolean(prim || sec || (!isPhone && tert));

    return (
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-scrim bg-scrim animate-in fade-in-0 duration-base" />
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-overlay flex flex-col pointer-events-none',
            variant === 'side-panel'
              ? 'sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-full'
              : 'sm:inset-0 sm:items-center sm:justify-center sm:p-space-16',
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
              'pointer-events-auto bg-surface flex flex-col overflow-hidden text-body text-ink border-line-soft focus:outline-none max-h-dvh w-full',
              'rounded-t-ds-sheet shadow-sheet border-t',
              variant === 'side-panel'
                ? 'sm:rounded-none sm:rounded-l-ds-xl sm:shadow-dialog sm:border-y-0 sm:border-r-0 sm:border-l sm:h-full sm:max-h-full sm:w-full sm:slide-in-from-right'
                : 'sm:rounded-ds-xl sm:shadow-dialog sm:border sm:zoom-in-95',
              dialogSizeClasses[size],
              'animate-in fade-in-0 duration-base slide-in-from-bottom sm:slide-in-from-bottom-0',
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
              <div className="sm:hidden cursor-grab active:cursor-grabbing touch-none">
                <DialogHandle />
              </div>

              {(title || desc || showClose || srTitle) && (
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
                        className="hidden sm:inline-flex text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
                      >
                        <Icon name="close" size="md" />
                      </button>
                    </DialogPrimitive.Close>
                  )}
                </div>
              )}
            </div>

            {children}

            {isPhone && tert && (
              <div className="mt-auto pt-space-16 pb-space-8 shrink-0">
                <SectionHeader
                  variant="danger"
                  label={
                    tertiaryLabel ||
                    (typeof tert === 'string'
                      ? tert
                      : typeof title === 'string'
                        ? title
                        : 'Delete')
                  }
                  className="-mx-space-16 sm:-mx-space-20 mb-space-12"
                />
                <div className="px-space-16">
                  {React.isValidElement(tert) ? (
                    React.cloneElement(
                      tert as React.ReactElement<{
                        className?: string;
                        size?: string;
                        variant?: string;
                      }>,
                      {
                        className: cn(
                          'w-full',
                          (tert.props as { className?: string }).className,
                        ),
                        size: 'xl',
                        variant:
                          (tert.props as { variant?: string }).variant ||
                          'danger-filled',
                      },
                    )
                  ) : (
                    <Button variant="danger-filled" size="xl" className="w-full">
                      {tert}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {hasFooterFromProps && (
              <DialogFooter
                primary={prim}
                secondary={sec}
                tertiary={!isPhone ? tert : undefined}
                isPhone={isPhone}
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
  confirmLabel?: React.ReactNode;
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
  showClose?: boolean;
  onClose?: () => void;
  forcePhone?: boolean;
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
      confirmLabel = 'Delete',
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
      showClose = true,
      onClose,
      children,
      className,
      forcePhone,
      ...props
    },
    ref,
  ) => {
    const isPhoneDevice = useIsPhone();
    const isPhone = forcePhone !== undefined ? forcePhone : isPhoneDevice;
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
        title={title}
        description={description}
        showClose={showClose}
        onClose={onCancel || onClose}
        forcePhone={forcePhone}
        className={cn('w-full', className)}
        {...props}
      >
        <DialogBody className="space-y-space-12">
          {isCheckingImpact ? (
            <div className="flex items-center gap-space-8 text-label text-ink-3 py-space-4">
              <span
                className="w-space-12 h-space-12 border-2 border-line-strong border-t-brand rounded-ds-pill animate-spin inline-block"
                aria-hidden="true"
              />
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

        <DialogFooter
          isPhone={isPhone}
          className={cn(isPhone && 'flex-col sm:flex-row items-stretch')}
        >
          {alternativeLabel ? (
            <Button
              type="button"
              variant="secondary"
              size={isPhone ? 'xl' : 'sm'}
              disabled={isBusy}
              onClick={onAlternative}
              className={cn(isPhone && 'w-full')}
            >
              {alternativeLabel}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size={isPhone ? 'xl' : 'sm'}
            disabled={isBusy}
            onClick={onCancel || onClose}
            className={cn(isPhone && 'w-full')}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant="danger-filled"
            size={isPhone ? 'xl' : 'sm'}
            loading={isBusy}
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
            className={cn(isPhone && 'w-full')}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
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
  confirmLabel = 'Delete',
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
  showClose = true,
  children,
  className,
  ...props
}) => {
  const isBusy = Boolean(loading || confirmLoading);
  const isConfirmDisabled = Boolean(
    confirmDisabled || isCheckingImpact || isBusy,
  );

  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  const handleAlternative = () => {
    onAlternative?.();
    onOpenChange?.(false);
  };

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirm?.();
  };

  return (
    <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      ) : null}
      <DialogContent
        size={size}
        title={title}
        description={description}
        showClose={showClose}
        onClose={handleCancel}
        className={className}
        {...props}
      >
        <DialogBody className="space-y-space-12">
          {isCheckingImpact ? (
            <div className="flex items-center gap-space-8 text-label text-ink-3 py-space-4">
              <span
                className="w-space-12 h-space-12 border-2 border-line-strong border-t-brand rounded-ds-pill animate-spin inline-block"
                aria-hidden="true"
              />
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

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-8">
          {alternativeLabel ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isBusy}
              onClick={handleAlternative}
              className="w-full sm:w-auto flex-1 order-2 sm:order-1"
            >
              {alternativeLabel}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isBusy}
            onClick={handleCancel}
            className="w-full sm:w-auto flex-1 order-3 sm:order-2"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant="danger-filled"
            size="sm"
            loading={isBusy}
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
            className="w-full sm:w-auto flex-1 order-1 sm:order-3"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ConfirmDialog.displayName = 'ConfirmDialog';
