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
            <div className="flex items-center gap-space-8 text-small text-ink-3 py-space-4">
              <span
                className="w-space-12 h-space-12 border-2 border-line-strong border-t-ink rounded-ds-circle animate-spin inline-block"
                aria-hidden="true"
              />
              <span>{checkingMessage}</span>
            </div>
          ) : impact && impact.length > 0 ? (
            <ul className="list-disc pl-space-20 space-y-space-6 text-small text-ink-2">
              {impact.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : null}

          {children}
        </SheetBody>

        <SheetFooter className="flex flex-col sm:flex-row gap-space-8">
          {alternativeLabel ? (
            <Button
              type="button"
              variant="secondary"
              size="phone"
              onClick={onAlternative}
              className="flex-1 order-2 sm:order-1"
            >
              {alternativeLabel}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="phone"
            onClick={onCancel}
            className="flex-1 order-3 sm:order-2"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant="danger-filled"
            size="phone"
            loading={confirmLoading}
            disabled={confirmDisabled || isCheckingImpact}
            onClick={onConfirm}
            className="flex-1 order-1 sm:order-3"
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
  confirmLoading = false,
  confirmDisabled = false,
  isCheckingImpact = false,
  checkingMessage = 'Checking what will be affected…',
  children,
  className,
  ...props
}) => {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  const handleAlternative = () => {
    onAlternative?.();
    onOpenChange?.(false);
  };

  const handleConfirm = () => {
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
        className={className}
        {...props}
      >
        <SheetBody className="space-y-space-12">
          {isCheckingImpact ? (
            <div className="flex items-center gap-space-8 text-small text-ink-3 py-space-4">
              <span
                className="w-space-12 h-space-12 border-2 border-line-strong border-t-ink rounded-ds-circle animate-spin inline-block"
                aria-hidden="true"
              />
              <span>{checkingMessage}</span>
            </div>
          ) : impact && impact.length > 0 ? (
            <ul className="list-disc pl-space-20 space-y-space-6 text-small text-ink-2">
              {impact.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : null}

          {children}
        </SheetBody>

        <SheetFooter className="flex flex-col sm:flex-row gap-space-8">
          {alternativeLabel ? (
            <Button
              type="button"
              variant="secondary"
              size="phone"
              onClick={handleAlternative}
              className="flex-1 order-2 sm:order-1"
            >
              {alternativeLabel}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="phone"
            onClick={handleCancel}
            className="flex-1 order-3 sm:order-2"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant="danger-filled"
            size="phone"
            loading={confirmLoading}
            disabled={confirmDisabled || isCheckingImpact}
            onClick={handleConfirm}
            className="flex-1 order-1 sm:order-3"
          >
            {confirmLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
ConfirmSheet.displayName = 'ConfirmSheet';
