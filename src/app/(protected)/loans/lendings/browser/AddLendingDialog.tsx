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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CounterpartyResponse, LendingDirection } from '@/lib/types';

interface AddLendingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counterparties: CounterpartyResponse[];
  selectedCpId: string;
  setSelectedCpId: (id: string) => void;
  newCpName: string;
  setNewCpName: (name: string) => void;
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
  txId: string;
  setTxId: (txId: string) => void;
  loading: boolean;
  onCreateLending: (e: React.FormEvent) => Promise<void>;
}

export function AddLendingDialog({
  open,
  onOpenChange,
  counterparties,
  selectedCpId,
  setSelectedCpId,
  newCpName,
  setNewCpName,
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
  txId,
  setTxId,
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
            <div className="space-y-1">
              <Label htmlFor="cpSelect" className="text-xs">
                Person / Counterparty *
              </Label>
              <Select
                value={selectedCpId}
                onValueChange={(v) => setSelectedCpId(v)}
              >
                <SelectTrigger id="cpSelect" className="h-9 text-xs">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new" className="text-xs">
                    + Add New Person
                  </SelectItem>
                  {counterparties.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id} className="text-xs">
                      {cp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCpId === 'new' && (
              <div className="space-y-1">
                <Label htmlFor="cpName" className="text-xs">
                  New Person Name *
                </Label>
                <Input
                  id="cpName"
                  placeholder="e.g. Rahul Sharma"
                  value={newCpName}
                  onChange={(e) => setNewCpName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            )}

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
                <Input
                  id="entryDate"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="expDate" className="text-xs">
                Expected Return Date (Optional)
              </Label>
              <Input
                id="expDate"
                type="date"
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

            <div className="space-y-1">
              <Label htmlFor="txId" className="text-xs">
                Linked Transaction ID (Optional)
              </Label>
              <Input
                id="txId"
                placeholder="UUID of bank transaction"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                className="h-9 text-xs"
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
