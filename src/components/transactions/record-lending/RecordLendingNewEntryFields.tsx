'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RecordLendingNewEntryFieldsProps {
  amount: string;
  setAmount: (value: string) => void;
  entryDate: string;
  setEntryDate: (value: string) => void;
  expectedReturnDate: string;
  setExpectedReturnDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
}

export function RecordLendingNewEntryFields({
  amount,
  setAmount,
  entryDate,
  setEntryDate,
  expectedReturnDate,
  setExpectedReturnDate,
  notes,
  setNotes,
}: RecordLendingNewEntryFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="lendingAmount" className="text-xs">
            Amount (₹) *
          </Label>
          <Input
            id="lendingAmount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lendingEntryDate" className="text-xs">
            Date *
          </Label>
          <Input
            id="lendingEntryDate"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="lendingExpDate" className="text-xs">
          Expected Return Date (Optional)
        </Label>
        <Input
          id="lendingExpDate"
          type="date"
          value={expectedReturnDate}
          onChange={(e) => setExpectedReturnDate(e.target.value)}
          className="h-9 text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="lendingNotes" className="text-xs">
          Notes (Optional)
        </Label>
        <Textarea
          id="lendingNotes"
          rows={2}
          placeholder="e.g. Dinner split, trip cash advance..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="text-xs"
        />
      </div>
    </div>
  );
}
