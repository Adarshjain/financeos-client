'use client';

import { LendingEntryTypePicker } from '@/components/lendings/LendingEntryTypePicker';
import { TransactionPicker } from '@/components/transactions/TransactionPicker';
import { DateInput } from '@/components/ui/date-input';
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
import {
  directionOf,
  isSettlementType,
  type LendingEntryType,
  settlementWarning,
} from '@/lib/lendingEntry';
import { Transaction } from '@/lib/transaction.types';

interface AddLendingEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cpName: string;
  /** Current balance with this person (positive = they owe you); drives the settlement warning. */
  netPosition: number;
  addEntryType: LendingEntryType;
  setAddEntryType: (t: LendingEntryType) => void;
  addAmount: string;
  setAddAmount: (a: string) => void;
  addEntryDate: string;
  setAddEntryDate: (d: string) => void;
  addExpDate: string;
  setAddExpDate: (d: string) => void;
  addNotes: string;
  setAddNotes: (n: string) => void;
  addSelectedTx: Transaction | null;
  onSelectAddTx: (t: Transaction) => void;
  onClearAddTx: () => void;
  submittingAddEntry: boolean;
  onAddEntry: (e: React.FormEvent) => Promise<void>;
}

export function AddLendingEntryDialog({
  open,
  onOpenChange,
  cpName,
  netPosition,
  addEntryType,
  setAddEntryType,
  addAmount,
  setAddAmount,
  addEntryDate,
  setAddEntryDate,
  addExpDate,
  setAddExpDate,
  addNotes,
  setAddNotes,
  addSelectedTx,
  onSelectAddTx,
  onClearAddTx,
  submittingAddEntry,
  onAddEntry,
}: AddLendingEntryDialogProps) {
  const settlement = isSettlementType(addEntryType);
  const warning = settlementWarning(addEntryType, Number(addAmount), netPosition, cpName);

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
            <LendingEntryTypePicker
              value={addEntryType}
              onChange={setAddEntryType}
              name="addEntryType"
            />

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
                <DateInput
                  value={addEntryDate}
                  onChange={(e) => setAddEntryDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>
            {warning && (
              <p className="text-2xs text-amber-600 dark:text-amber-400 px-1">{warning}</p>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Linked Transaction (Optional)</Label>
              <TransactionPicker
                value={addSelectedTx}
                onSelect={onSelectAddTx}
                onClear={onClearAddTx}
                direction={directionOf(addEntryType)}
                suggestAmount={addAmount ? Number(addAmount) : null}
                suggestDate={addEntryDate || null}
              />
            </div>

            {!settlement && (
              <div className="space-y-1">
                <Label className="text-xs">Expected Return Date (Optional)</Label>
                <DateInput
                  value={addExpDate}
                  onChange={(e) => setAddExpDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}

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
