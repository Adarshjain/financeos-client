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
}

export function ConfirmationDialog(props: ConfirmationDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={props.loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              try {
                debugger
                await props.primaryAction?.();
                setOpen(false);
              } catch (error) {
                toast.error((error as Error).message);
              }
            }} disabled={props.loading}>
            {props.primaryActionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}