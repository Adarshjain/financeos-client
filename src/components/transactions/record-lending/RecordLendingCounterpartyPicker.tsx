'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CounterpartyResponse } from '@/lib/lending.types';

import { NEW_COUNTERPARTY_VALUE } from './useRecordLending';

interface RecordLendingCounterpartyPickerProps {
  counterparties: CounterpartyResponse[];
  loading: boolean;
  selectedCpId: string;
  setSelectedCpId: (id: string) => void;
  newCpName: string;
  setNewCpName: (name: string) => void;
  showNewNameInput: boolean;
}

export function RecordLendingCounterpartyPicker({
  counterparties,
  loading,
  selectedCpId,
  setSelectedCpId,
  newCpName,
  setNewCpName,
  showNewNameInput,
}: RecordLendingCounterpartyPickerProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor="lendingCpSelect" className="text-xs">
        Person / Counterparty *
      </Label>
      <Select value={selectedCpId} onValueChange={setSelectedCpId}>
        <SelectTrigger id="lendingCpSelect" className="h-9 text-xs">
          <SelectValue placeholder={loading ? 'Loading…' : 'Select person'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NEW_COUNTERPARTY_VALUE} className="text-xs">
            + Add new person
          </SelectItem>
          {counterparties.map((cp) => (
            <SelectItem key={cp.id} value={cp.id} className="text-xs">
              {cp.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showNewNameInput && (
        <Input
          placeholder="e.g. Rahul Sharma"
          value={newCpName}
          onChange={(e) => setNewCpName(e.target.value)}
          className="h-9 text-xs mt-1"
        />
      )}
    </div>
  );
}
