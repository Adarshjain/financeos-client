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
import { LendingDirection } from '@/lib/types';

interface EditLendingEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lendingDir: LendingDirection;
  setLendingDir: (d: LendingDirection) => void;
  lendingAmount: string;
  setLendingAmount: (a: string) => void;
  lendingDate: string;
  setLendingDate: (d: string) => void;
  lendingExpDate: string;
  setLendingExpDate: (d: string) => void;
  lendingNotes: string;
  setLendingNotes: (n: string) => void;
  submittingEditLending: boolean;
  onUpdateLending: (e: React.FormEvent) => Promise<void>;
}

export function EditLendingEntryDialog({
  open,
  onOpenChange,
  lendingDir,
  setLendingDir,
  lendingAmount,
  setLendingAmount,
  lendingDate,
  setLendingDate,
  lendingExpDate,
  setLendingExpDate,
  lendingNotes,
  setLendingNotes,
  submittingEditLending,
  onUpdateLending,
}: EditLendingEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Edit Ledger Entry
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="edit-lending-form"
            onSubmit={onUpdateLending}
            className="space-y-3 pt-1 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs">Direction</Label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="editDir"
                    checked={lendingDir === 'lent'}
                    onChange={() => setLendingDir('lent')}
                  />
                  <span>I gave money (Lent)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="editDir"
                    checked={lendingDir === 'borrowed'}
                    onChange={() => setLendingDir('borrowed')}
                  />
                  <span>I received money (Borrowed)</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={lendingAmount}
                  onChange={(e) => setLendingAmount(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={lendingDate}
                  onChange={(e) => setLendingDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expected Return Date</Label>
              <Input
                type="date"
                value={lendingExpDate}
                onChange={(e) => setLendingExpDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                value={lendingNotes}
                onChange={(e) => setLendingNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: submittingEditLending ? 'Saving...' : 'Save Changes',
            type: 'submit',
            form: 'edit-lending-form',
            disabled: submittingEditLending,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
