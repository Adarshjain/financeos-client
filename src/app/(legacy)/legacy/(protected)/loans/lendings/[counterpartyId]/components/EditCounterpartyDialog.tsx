'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EditCounterpartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cpName: string;
  setCpName: (n: string) => void;
  cpNotes: string;
  setCpNotes: (n: string) => void;
  submittingCp: boolean;
  onUpdateCp: (e: React.FormEvent) => Promise<void>;
}

export function EditCounterpartyDialog({
  open,
  onOpenChange,
  cpName,
  setCpName,
  cpNotes,
  setCpNotes,
  submittingCp,
  onUpdateCp,
}: EditCounterpartyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Edit Person Details
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="edit-cp-form"
            onSubmit={onUpdateCp}
            className="space-y-3 pt-1 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input
                value={cpName}
                onChange={(e) => setCpName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                value={cpNotes}
                onChange={(e) => setCpNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: submittingCp ? 'Saving...' : 'Save Changes',
            type: 'submit',
            form: 'edit-cp-form',
            disabled: submittingCp,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
