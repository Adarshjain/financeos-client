import { JSX, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toastError } from '@/lib/toastError';

interface ConfirmationDialogProps {
  title: string;
  description?: string | JSX.Element;
  primaryActionText?: string;
  secondaryActionText?: string;
  secondaryAction?: () => void;
  primaryAction?: () => void | Promise<void>;
  /** Opens the dialog on click. Omit when driving `open` from the parent. */
  trigger?: JSX.Element;
  /** Controlled open state; when provided, `onOpenChange` receives every close. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function ConfirmationDialog(props: ConfirmationDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const busy = running || props.loading;

  const isControlled = props.open !== undefined;
  const open = isControlled ? props.open : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    props.onOpenChange?.(next);
  };

  const handlePrimary = async () => {
    if (running) return;
    setRunning(true);
    try {
      await props.primaryAction?.();
      setOpen(false);
    } catch (error) {
      toastError(error, "An unexpected error occurred");
    } finally {
      setRunning(false);
    }
  };

  const handleSecondary = () => {
    props.secondaryAction?.();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
    >
      {props.trigger && (
        <DialogTrigger asChild>
          {props.trigger}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter
          primaryAction={{
            label: props.primaryActionText ?? 'Confirm',
            variant: props.variant ?? 'destructive',
            onClick: handlePrimary,
            disabled: busy,
          }}
          secondaryAction={{
            label: props.secondaryActionText ?? 'Cancel',
            onClick: handleSecondary,
            disabled: busy,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
