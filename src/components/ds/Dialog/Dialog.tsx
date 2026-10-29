'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { createContext, forwardRef, useCallback, useContext, useRef } from 'react';

import { ActionButton } from '../Button/ActionButton';
import { cn } from '../cn';
import { concealMoney } from '../Conceal/concealMoney';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/registry';
import { Reveal } from '../Reveal/Reveal';
import { SectionHeader } from '../SectionHeader/SectionHeader';
import { useControllableState } from '../useControllableState';
import { useSheetDrag } from '../useSheetDrag';

/** `full` fills the whole viewport (100dvw x 100dvh), on phone too: no sheet, no handle. */
/**
 * `md` for forms (default), `sm` for a single field, `lg` only for two columns. Section labels inside a dialog are
 * always `Dialog.Section` (the band style). On phone a sheet never reaches the top: it keeps a gap above its handle.
 */
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type DialogVariant = 'modal' | 'side-panel';
export type DialogBackground = 'surface' | 'canvas';

const dialogSizeClasses: Record<DialogSize, string> = {
  ['sm']: 'desk:max-w-container-sm',
  ['md']: 'desk:max-w-container-md',
  ['lg']: 'desk:max-w-container-lg',
  ['xl']: 'desk:max-w-container-xl',
  ['full']: '',
};

const fullPanelClasses = 'w-dvw h-dvh max-h-dvh rounded-none shadow-none border-0';

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

const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-space-16 desk:px-space-20 py-space-10 overflow-y-auto flex flex-col gap-space-8 desk:gap-space-12 flex-1 touch-pan-y overscroll-contain',
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

export interface DialogSectionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** The whole band becomes the toggle, with a chevron, and the content folds with Reveal */
  collapsible?: boolean;
  open?: boolean;
  /** Collapsible only; sections start open */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Dialog.Section: a section band that spans the dialog edge to edge (it cancels DialogBody's side
 * padding), with its content below at the body's own padding, so band and body text line up.
 */
const DialogSection = forwardRef<HTMLDivElement, DialogSectionProps>(
  (
    {
      title,
      collapsible = false,
      open: controlledOpen,
      defaultOpen = true,
      onOpenChange,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setOpen] = useControllableState<boolean>({
      value: controlledOpen,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });
    const shown = !collapsible || isOpen;
    const toggle = () => setOpen(!isOpen);

    return (
      <div
        ref={ref}
        className={cn('-mx-space-16 desk:-mx-space-20 flex flex-col', className)}
        {...props}
      >
        <SectionHeader
          variant="band"
          className={cn(
            'px-space-16 desk:px-space-20',
            collapsible &&
              'cursor-pointer transition-colors duration-fast hover:bg-hover active:bg-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset'
          )}
          action={
            collapsible ? (
              <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size="md" className="text-ink-4" />
            ) : undefined
          }
          {...(collapsible
            ? {
                role: 'button',
                tabIndex: 0,
                'aria-expanded': isOpen,
                onClick: toggle,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                  }
                },
              }
            : {})}
        >
          {title}
        </SectionHeader>
        {collapsible ? (
          <Reveal open={shown}>
            <div className="px-space-16 desk:px-space-20 py-space-10 flex flex-col gap-space-8 desk:gap-space-12">{children}</div>
          </Reveal>
        ) : (
          <div className="px-space-16 desk:px-space-20 py-space-10 flex flex-col gap-space-8 desk:gap-space-12">{children}</div>
        )}
      </div>
    );
  }
);

DialogSection.displayName = 'DialogSection';

export interface DialogBleedProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Dialog.Bleed: wraps content that runs edge to edge inside DialogBody (a band and its table). It
 * cancels the body's side padding, the same amount as Dialog.Section; the content keeps its own inner padding.
 */
const DialogBleed = forwardRef<HTMLDivElement, DialogBleedProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('-mx-space-16 desk:-mx-space-20 flex flex-col', className)} {...props}>
      {children}
    </div>
  )
);

DialogBleed.displayName = 'DialogBleed';

export interface DialogAction {
  label: React.ReactNode;
  onSelect?: () => void;
  /** Draws the action as a real link to this address (the app's link through LinkProvider); `onSelect` still runs on click. */
  href?: string;
  type?: 'button' | 'submit';
  form?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Icon registry name drawn before the label (xs, beside button text). */
  icon?: IconName;
  /** `danger` draws a secondary or tertiary action as a danger link, and a primary action as the danger-filled confirm. */
  tone?: 'danger';
}

export type DialogPrimaryAction = DialogAction;

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Primary / confirming action (rendered last, far right on desktop) */
  primary?: DialogPrimaryAction;
  /** Secondary action (rendered before primary) */
  secondary?: DialogAction;
  /** Optional tertiary action (rendered first, far left) */
  tertiary?: DialogAction;
}

const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
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
              <ActionButton
                key="tertiary"
                variant={tertiary.tone === 'danger' ? 'danger-ghost' : 'ghost'}
                size="md"
                type={tertiary.type ?? 'button'}
                form={tertiary.form}
                disabled={tertiary.disabled}
                loading={tertiary.loading}
                icon={tertiary.icon ? <Icon name={tertiary.icon} size="md" /> : undefined}
                href={tertiary.href}
                onSelect={tertiary.onSelect}
                className="w-full desk:w-auto"
              >
                {tertiary.label}
              </ActionButton>
            )}
            {secondary && (
              <ActionButton
                key="secondary"
                variant={secondary.tone === 'danger' ? 'danger-ghost' : 'ghost'}
                size="md"
                type={secondary.type ?? 'button'}
                form={secondary.form}
                disabled={secondary.disabled}
                loading={secondary.loading}
                icon={secondary.icon ? <Icon name={secondary.icon} size="md" /> : undefined}
                href={secondary.href}
                onSelect={secondary.onSelect}
                className="w-full desk:w-auto"
              >
                {secondary.label}
              </ActionButton>
            )}
            {primary && (
              <ActionButton
                key="primary"
                variant={primary.tone === 'danger' ? 'danger-filled' : 'primary'}
                size="md"
                type={primary.type ?? 'button'}
                form={primary.form}
                disabled={primary.disabled}
                loading={primary.loading}
                icon={primary.icon ? <Icon name={primary.icon} size="xs" /> : undefined}
                href={primary.href}
                onSelect={primary.onSelect}
                className="w-full desk:w-auto"
              >
                {primary.label}
              </ActionButton>
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
  onDismiss?: () => void;
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
      onDismiss,
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
    const isFull = size === 'full';

    return (
      <div
        ref={ref}
        className={cn(
          background === 'canvas' ? 'bg-canvas' : 'bg-surface',
          'flex flex-col overflow-hidden font-text text-body text-ink border-line-soft',
          isFull
            ? fullPanelClasses
            : cn(
                'max-h-dvh-safe desk:max-h-dvh w-full rounded-t-ds-2xl shadow-up-2 border-t',
                variant === 'side-panel'
                  ? 'desk:rounded-ds-lg desk:shadow-none desk:border desk:border-line desk:flex-1 desk:min-h-0 desk:max-h-full desk:w-full'
                  : 'desk:rounded-ds-xl desk:shadow-level-3 desk:border',
              ),
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
          {...(dismissible && !isFull ? dragProps : {})}
          className="select-none shrink-0 touch-none"
        >
          {dismissible && !isFull ? (
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
                        {concealMoney(title)}
                      </div>
                    </DialogPrimitive.Title>
                  ) : (
                    <div className="font-extrabold text-title text-ink leading-tight">
                      {concealMoney(title)}
                    </div>
                  )
                )}
                {description && (
                  isRadix ? (
                    <DialogPrimitive.Description asChild>
                      <div className="text-label text-ink-3 mt-space-2">
                        {concealMoney(description)}
                      </div>
                    </DialogPrimitive.Description>
                  ) : (
                    <div className="text-label text-ink-3 mt-space-2">
                      {concealMoney(description)}
                    </div>
                  )
                )}
              </div>
              {showClose && onDismiss && (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onDismiss}
                  className={cn(
                    isFull ? 'inline-flex' : 'hidden desk:inline-flex',
                    'text-ink-4 hover:text-ink hover:bg-hover p-space-6 rounded-ds-md ml-auto shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
                  )}
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
  onDismiss?: () => void;
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
      onDismiss,
      dismissible = true,
      ...props
    },
    ref
  ) => {
    const { dragOffset, isDragging, dragProps } = useSheetDrag({
      onDismiss,
    });

    return (
      <DialogPanel
        ref={ref}
        onDismiss={onDismiss}
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

const DialogRoot = ({
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
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

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
  onDismiss?: () => void;
  primary?: DialogPrimaryAction;
  secondary?: DialogAction;
  tertiary?: DialogAction;
  dismissible?: boolean;
}

const DialogContent = forwardRef<
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
      onDismiss,
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
    const isFull = size === 'full';

    const handleClose = () => {
      closeRef.current?.click();
      onDismiss?.();
    };

    const { dragOffset, isDragging, dragProps, reset: resetDrag } = useSheetDrag({
      onDismiss: handleClose,
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

    // Backdrop and panel share one layer (z-overlay) and stack by portal order, so a dialog opened
    // over another has its own backdrop above the one underneath, dimming it and blocking its taps.
    return (
      <DialogPortal>
        {variant === 'side-panel' ? (
          <div
            data-testid="dialog-backdrop"
            data-state={open ? 'open' : 'closed'}
            onClick={dismissible ? handleClose : undefined}
            className="desk:hidden fixed inset-0 z-overlay bg-backdrop animate-in fade-in-0 duration-slow data-closed:animate-out data-closed:fade-out-0 data-closed:fill-mode-forwards data-closed:duration-slow"
          />
        ) : (
          <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-backdrop animate-in fade-in-0 duration-slow desk:duration-base data-closed:animate-out data-closed:fade-out-0 data-closed:fill-mode-forwards data-closed:duration-slow desk:data-closed:duration-base" />
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
            isFull
              ? 'inset-0'
              : variant === 'side-panel'
              ? cn('desk:top-space-24 desk:right-space-24 desk:bottom-space-24 desk:left-auto desk:w-full', dialogSizeClasses[size])
              : 'desk:inset-0 desk:items-center desk:justify-center desk:p-space-16',
            // A side panel's className places it (the page sets its top offset); the modal's goes to the panel.
            variant === 'side-panel' && !isFull && className
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
              'pointer-events-auto flex flex-col overflow-hidden font-text text-body text-ink border-line-soft',
              background === 'canvas' ? 'bg-canvas' : 'bg-surface',
              isFull
                ? cn(
                    fullPanelClasses,
                    'animate-in fade-in-0 group-data-closed:animate-out group-data-closed:fade-out-0 group-data-closed:fill-mode-forwards group-data-closed:duration-slow desk:group-data-closed:duration-base',
                  )
                : cn(
                    'max-h-dvh-safe desk:max-h-dvh w-full rounded-t-ds-2xl shadow-up-2 border-t',
                    variant === 'side-panel'
                      ? 'desk:rounded-ds-lg desk:shadow-none desk:border desk:border-line desk:flex-1 desk:min-h-0 desk:max-h-full desk:w-full desk:slide-in-from-right desk:group-data-closed:slide-out-to-right'
                      : 'desk:rounded-ds-xl desk:shadow-level-3 desk:border desk:zoom-in-95 desk:group-data-closed:zoom-out-95',
                    dialogSizeClasses[size],
                    'animate-in fade-in-0 slide-in-from-bottom desk:slide-in-from-bottom-0',
                    'group-data-closed:animate-out group-data-closed:fade-out-0 group-data-closed:slide-out-to-bottom desk:group-data-closed:slide-out-to-bottom-0 group-data-closed:fill-mode-forwards group-data-closed:duration-slow desk:group-data-closed:duration-base',
                  ),
              isDragging
                ? 'transition-none'
                : 'transition-transform duration-slow ease-out desk:duration-base',
              (variant !== 'side-panel' || isFull) && className
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
              onDismiss={handleClose}
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

export const Dialog = Object.assign(DialogRoot, {
  Body: DialogBody,
  Footer: DialogFooter,
  Content: DialogContent,
  Trigger: DialogTrigger,
  Close: DialogClose,
  Portal: DialogPortal,
  Section: DialogSection,
  Bleed: DialogBleed,
});

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
  onDismiss?: () => void;
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
      onDismiss,
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
        onDismiss={onCancel || onDismiss}
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
          onSelect: onCancel || onDismiss,
          disabled: isBusy,
        }}
        primary={{
          label: confirmLabel,
          onSelect: handleConfirm,
          tone: tone === 'danger' ? 'danger' : undefined,
          loading: isBusy,
          disabled: isConfirmDisabled,
        }}
        className={cn('w-full', className)}
        {...props}
      >
        <DialogBody className="space-y-space-8 desk:space-y-space-12">
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
          onDismiss={handleCancel}
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
            tone: tone === 'danger' ? 'danger' : undefined,
            loading: isBusy,
            disabled: isConfirmDisabled,
          }}
          {...props}
        >
          <DialogBody className="space-y-space-8 desk:space-y-space-12">
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
