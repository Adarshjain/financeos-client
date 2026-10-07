'use client';

import { CounterpartyPicker } from '@/components/lendings/CounterpartyPicker';
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
import type { CounterpartySelection } from '@/lib/lending.types';
import { Transaction } from '@/lib/transaction.types';
import { LendingDirection } from '@/lib/types';

interface AddLendingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party: CounterpartySelection | null;
  setParty: (party: CounterpartySelection | null) => void;
  direction: LendingDirection;
  setDirection: (dir: LendingDirection) => void;
  amount: string;
  setAmount: (amt: string) => void;
  entryDate: string;
  setEntryDate: (date: string) => void;
  expectedReturnDate: string;
  setExpectedReturnDate: (date: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  selectedTx: Transaction | null;
  onSelectTx: (t: Transaction) => void;
  onClearTx: () => void;
  loading: boolean;
  onCreateLending: (e: React.FormEvent) => Promise<void>;
}

export function AddLendingDialog({
  open,
  onOpenChange,
  party,
  setParty,
  direction,
  setDirection,
  amount,
  setAmount,
  entryDate,
  setEntryDate,
  expectedReturnDate,
  setExpectedReturnDate,
  notes,
  setNotes,
  selectedTx,
  onSelectTx,
  onClearTx,
  loading,
  onCreateLending,
}: AddLendingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Add Ledger Entry
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form
            id="add-lending-form"
            onSubmit={onCreateLending}
            className="space-y-3 pt-1 text-xs"
          >
            <CounterpartyPicker id="cpSelect" value={party} onChange={setParty} />

            <div className="space-y-1">
              <Label className="text-xs">Direction *</Label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                  <input
                    type="radio"
                    name="lendingDir"
                    checked={direction === 'lent'}
                    onChange={() => setDirection('lent')}
                  />
                  <span>I gave money (Lent)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-600 dark:text-rose-400 text-xs">
                  <input
                    type="radio"
                    name="lendingDir"
                    checked={direction === 'borrowed'}
                    onChange={() => setDirection('borrowed')}
                  />
                  <span>I received money (Borrowed)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-xs">
                  Amount (₹) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="entryDate" className="text-xs">
                  Date *
                </Label>
                <DateInput
                  id="entryDate"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Linked Transaction (Optional)</Label>
              <TransactionPicker
                value={selectedTx}
                onSelect={onSelectTx}
                onClear={onClearTx}
                direction={direction}
                suggestAmount={amount ? Number(amount) : null}
                suggestDate={entryDate || null}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="expDate" className="text-xs">
                Expected Return Date (Optional)
              </Label>
              <DateInput
                id="expDate"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="e.g. Dinner split, trip cash advance..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: loading ? 'Saving...' : 'Save Entry',
            type: 'submit',
            form: 'add-lending-form',
            disabled: loading,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
