import { JSX, useState } from 'react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ConfirmationDialogProps {
  title: string;
  description?: string | JSX.Element;
  primaryActionText?: string;
  secondaryActionText?: string;
  secondaryAction?: () => void;
  primaryAction?: () => void | Promise<void>;
  trigger: JSX.Element;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function ConfirmationDialog(props: ConfirmationDialogProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const busy = running || props.loading;

  const handlePrimary = async () => {
    if (running) return;
    setRunning(true);
    try {
      await props.primaryAction?.();
      setOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
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
      <DialogTrigger asChild>
        {props.trigger}
      </DialogTrigger>
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