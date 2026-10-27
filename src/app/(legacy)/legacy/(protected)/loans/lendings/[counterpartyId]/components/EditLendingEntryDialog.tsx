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
  entryTypesForDirection,
  isSettlementType,
  type LendingEntryType,
} from '@/lib/lendingEntry';
import { Transaction } from '@/lib/transaction.types';
import { LendingTransactionSummary } from '@/lib/types';

interface EditLendingEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lendingEntryType: LendingEntryType;
  setLendingEntryType: (t: LendingEntryType) => void;
  lendingAmount: string;
  setLendingAmount: (a: string) => void;
  lendingDate: string;
  setLendingDate: (d: string) => void;
  lendingExpDate: string;
  setLendingExpDate: (d: string) => void;
  lendingNotes: string;
  setLendingNotes: (n: string) => void;
  editSelectedTx: LendingTransactionSummary | Transaction | null;
  onSelectEditTx: (t: Transaction) => void;
  onClearEditTx: () => void;
  submittingEditLending: boolean;
  onUpdateLending: (e: React.FormEvent) => Promise<void>;
}

export function EditLendingEntryDialog({
  open,
  onOpenChange,
  lendingEntryType,
  setLendingEntryType,
  lendingAmount,
  setLendingAmount,
  lendingDate,
  setLendingDate,
  lendingExpDate,
  setLendingExpDate,
  lendingNotes,
  setLendingNotes,
  editSelectedTx,
  onSelectEditTx,
  onClearEditTx,
  submittingEditLending,
  onUpdateLending,
}: EditLendingEntryDialogProps) {
  // A linked transaction fixes the money direction (DEBIT <-> lent, CREDIT <->
  // borrowed); principal <-> settlement within that direction stays editable.
  const directionLocked = Boolean(editSelectedTx);
  const direction = directionOf(lendingEntryType);
  const settlement = isSettlementType(lendingEntryType);

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
            <LendingEntryTypePicker
              value={lendingEntryType}
              onChange={setLendingEntryType}
              enabled={directionLocked ? entryTypesForDirection(direction) : undefined}
              lockedHint="Unlink the transaction to change direction."
              name="editEntryType"
              label="Entry type"
            />
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
                <DateInput
                  value={lendingDate}
                  onChange={(e) => setLendingDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Linked Transaction</Label>
              <TransactionPicker
                value={editSelectedTx}
                onSelect={onSelectEditTx}
                onClear={onClearEditTx}
                direction={direction}
                suggestAmount={lendingAmount ? Number(lendingAmount) : null}
                suggestDate={lendingDate || null}
              />
            </div>
            {!settlement && (
              <div className="space-y-1">
                <Label className="text-xs">Expected Return Date</Label>
                <DateInput
                  value={lendingExpDate}
                  onChange={(e) => setLendingExpDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}
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
