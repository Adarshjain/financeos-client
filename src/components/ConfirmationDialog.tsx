import { JSX, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
  // Derived from the awaited action rather than trusting the caller's optional
  // `loading` prop. The primary action is usually destructive, and any caller
  // that omitted `loading` previously had no protection against repeated
  // clicks firing it concurrently.
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

  return (
    <Dialog
      open={open}
      // Don't let an outside click or Escape dismiss mid-flight.
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {props.trigger}
      </DialogTrigger>
      <DialogContent className="p-4">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="flex gap-2 flex-row">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy} className="flex-1">
            Cancel
          </Button>
          <Button
            variant={props.variant ?? 'destructive'}
            onClick={handlePrimary}
            disabled={busy}
            className="flex-1"
          >
            {props.primaryActionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}