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

interface AddLendingEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cpName: string;
  addDir: LendingDirection;
  setAddDir: (d: LendingDirection) => void;
  addAmount: string;
  setAddAmount: (a: string) => void;
  addEntryDate: string;
  setAddEntryDate: (d: string) => void;
  addExpDate: string;
  setAddExpDate: (d: string) => void;
  addNotes: string;
  setAddNotes: (n: string) => void;
  submittingAddEntry: boolean;
  onAddEntry: (e: React.FormEvent) => Promise<void>;
}

export function AddLendingEntryDialog({
  open,
  onOpenChange,
  cpName,
  addDir,
  setAddDir,
  addAmount,
  setAddAmount,
  addEntryDate,
  setAddEntryDate,
  addExpDate,
  setAddExpDate,
  addNotes,
  setAddNotes,
  submittingAddEntry,
  onAddEntry,
}: AddLendingEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Add Ledger Entry for {cpName}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="add-entry-form"
            onSubmit={onAddEntry}
            className="space-y-3 pt-1 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs">Direction *</Label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                  <input
                    type="radio"
                    name="addDir"
                    checked={addDir === 'lent'}
                    onChange={() => setAddDir('lent')}
                  />
                  <span>I gave money (Lent)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-600 dark:text-rose-400 text-xs">
                  <input
                    type="radio"
                    name="addDir"
                    checked={addDir === 'borrowed'}
                    onChange={() => setAddDir('borrowed')}
                  />
                  <span>I received money (Borrowed)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="5000"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={addEntryDate}
                  onChange={(e) => setAddEntryDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Expected Return Date (Optional)
              </Label>
              <Input
                type="date"
                value={addExpDate}
                onChange={(e) => setAddExpDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes (Optional)</Label>
              <Textarea
                rows={2}
                placeholder="Notes..."
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: submittingAddEntry ? 'Saving...' : 'Add Entry',
            type: 'submit',
            form: 'add-entry-form',
            disabled: submittingAddEntry,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
