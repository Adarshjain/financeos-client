import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetShell,
} from '../Sheet/Sheet';

export interface ConfirmSheetShellProps
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
}

/**
 * Visual shell for destructive confirmations (standalone / preview presentation).
 * States: names object, explains impact (what goes and what stays),
 * offers cancel, optional gentler alternative, and primary filled-danger confirm action.
 */
export const ConfirmSheetShell = forwardRef<
  HTMLDivElement,
  ConfirmSheetShellProps
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
      <SheetShell
        ref={ref}
        title={title}
        description={description}
        className={cn('w-full', className)}
        {...props}
      >
        <SheetBody className="space-y-space-12">
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
        </SheetBody>

        <SheetFooter className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-8">
          {alternativeLabel ? (
            <Button
              type="button"
              variant="secondary"
              size="xl"
              disabled={isBusy}
              onClick={onAlternative}
              className="w-full sm:w-auto flex-1 order-2 sm:order-1"
            >
              {alternativeLabel}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="xl"
            disabled={isBusy}
            onClick={onCancel}
            className="w-full sm:w-auto flex-1 order-3 sm:order-2"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant="danger-filled"
            size="xl"
            loading={isBusy}
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
            className="w-full sm:w-auto flex-1 order-1 sm:order-3"
          >
            {confirmLabel}
          </Button>
        </SheetFooter>
      </SheetShell>
    );
  },
);

ConfirmSheetShell.displayName = 'ConfirmSheetShell';

export interface ConfirmSheetProps extends ConfirmSheetShellProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

/**
 * Accessible modal bottom sheet for destructive actions and unsaved edits confirmation.
 */
export const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
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
    <Sheet open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      ) : null}
      <SheetContent
        title={title}
        description={description}
        onClose={handleCancel}
        className={className}
        {...props}
      >
        <SheetBody className="space-y-space-12">
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
        </SheetBody>

        <SheetFooter className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-8">
          {alternativeLabel ? (
            <Button
              type="button"
              variant="secondary"
              size="xl"
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
            size="xl"
            disabled={isBusy}
            onClick={handleCancel}
            className="w-full sm:w-auto flex-1 order-3 sm:order-2"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant="danger-filled"
            size="xl"
            loading={isBusy}
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
            className="w-full sm:w-auto flex-1 order-1 sm:order-3"
          >
            {confirmLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
ConfirmSheet.displayName = 'ConfirmSheet';
