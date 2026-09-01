'use client';

import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Broker } from '@/lib/account.types';
import { DividendType, Position } from '@/lib/types';

interface DividendFormFieldsProps {
  brokerAccountId: string;
  setBrokerAccountId: (id: string) => void;
  setInstrumentId: (id: string) => void;
  brokerAccounts: Broker[];
  instrumentId: string;
  brokerPositions: Position[];
  type: DividendType;
  setType: (type: DividendType) => void;
  amount: string;
  setAmount: (amt: string) => void;
  perUnit: string;
  setPerUnit: (p: string) => void;
  tds: string;
  setTds: (t: string) => void;
  exDate: string;
  setExDate: (d: string) => void;
  payDate: string;
  setPayDate: (d: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function DividendFormFields({
  brokerAccountId,
  setBrokerAccountId,
  setInstrumentId,
  brokerAccounts,
  instrumentId,
  brokerPositions,
  type,
  setType,
  amount,
  setAmount,
  perUnit,
  setPerUnit,
  tds,
  setTds,
  exDate,
  setExDate,
  payDate,
  setPayDate,
  notes,
  setNotes,
  onSubmit,
}: DividendFormFieldsProps) {
  return (
    <form
      id="dividend-dialog-form"
      onSubmit={onSubmit}
      className="space-y-4 pt-1"
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Broker Account" required>
          <Select
            value={brokerAccountId}
            onValueChange={(val) => {
              setBrokerAccountId(val);
              setInstrumentId('');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select broker" />
            </SelectTrigger>
            <SelectContent>
              {brokerAccounts.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Instrument" required>
          <Select value={instrumentId} onValueChange={setInstrumentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select instrument" />
            </SelectTrigger>
            <SelectContent>
              {brokerPositions.map((p) => (
                <SelectItem key={p.instrument.id} value={p.instrument.id}>
                  {p.instrument.name} ({p.instrument.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Payout Type" required>
          <Select
            value={type}
            onValueChange={(v) => setType(v as DividendType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dividend">Dividend</SelectItem>
              <SelectItem value="interest">Interest</SelectItem>
              <SelectItem value="capital_gain">
                Capital Gain Distribution
              </SelectItem>
              <SelectItem value="other">Other Payout</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Net Amount Received" required>
          <input
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Per Unit Amount">
          <input
            type="number"
            step="0.01"
            placeholder="Optional"
            value={perUnit}
            onChange={(e) => setPerUnit(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
          />
        </FormField>

        <FormField label="TDS Deducted">
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={tds}
            onChange={(e) => setTds(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Ex-Date">
          <input
            type="date"
            value={exDate}
            onChange={(e) => setExDate(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          />
        </FormField>

        <FormField label="Payout / Credit Date" required>
          <input
            type="date"
            required
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          />
        </FormField>
      </div>

      <FormField label="Notes">
        <input
          type="text"
          placeholder="e.g. Q4 Interim Dividend"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        />
      </FormField>
    </form>
  );
}
