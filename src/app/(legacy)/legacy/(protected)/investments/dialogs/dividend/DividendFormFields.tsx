'use client';

import { FormField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
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

const SELECT_TRIGGER =
  'w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs';
const SELECT_CONTENT = 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800';
const LABEL = 'text-xs font-semibold text-slate-700 dark:text-slate-300';

/**
 * Fields of the shared dividend dialog. Selects sit under a plain `Label`;
 * `FormField` is itself an input wrapper, so it is used only for the text,
 * number and date inputs (its `type="date"` routes to `DateInput`). Mirrors
 * the markup of `CreateDividendDialog`.
 */
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
    <form id="dividend-dialog-form" onSubmit={onSubmit} className="space-y-3 py-1">
      <div className="space-y-1.5">
        <Label htmlFor="dividend-broker" className={LABEL}>Broker Account</Label>
        <Select
          value={brokerAccountId}
          onValueChange={(val) => {
            setBrokerAccountId(val);
            setInstrumentId('');
          }}
        >
          <SelectTrigger id="dividend-broker" className={SELECT_TRIGGER}>
            <SelectValue placeholder="Select broker..." />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {brokerAccounts.map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-xs">
                {b.name} ({b.provider || 'Broker'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dividend-instrument" className={LABEL}>Held Instrument</Label>
        <Select value={instrumentId} onValueChange={setInstrumentId}>
          <SelectTrigger id="dividend-instrument" className={SELECT_TRIGGER}>
            <SelectValue
              placeholder={
                brokerPositions.length === 0
                  ? 'No held positions for this broker'
                  : 'Select held instrument...'
              }
            />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {brokerPositions.map((p) => (
              <SelectItem key={p.instrument.id} value={p.instrument.id} className="text-xs">
                {p.instrument.name}{' '}
                {p.instrument.symbol ? `(${p.instrument.symbol})` : `[${p.instrument.type}]`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dividend-type" className={LABEL}>Type</Label>
          <Select value={type} onValueChange={(val) => setType(val as DividendType)}>
            <SelectTrigger id="dividend-type" className={SELECT_TRIGGER}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              <SelectItem value="dividend" className="text-xs">
                Dividend
              </SelectItem>
              <SelectItem value="interest" className="text-xs">
                Interest
              </SelectItem>
              <SelectItem value="other" className="text-xs">
                Other Payout
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <FormField
          label="Payment Date"
          name="payDate"
          type="date"
          value={payDate}
          onChange={(e) => setPayDate(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Total Amount (INR)"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />

        <FormField
          label="TDS Deducted (INR)"
          name="tds"
          type="number"
          step="0.01"
          min="0"
          value={tds}
          onChange={(e) => setTds(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Per Unit Amount (Optional)"
          name="perUnit"
          type="number"
          step="0.0001"
          min="0"
          value={perUnit}
          onChange={(e) => setPerUnit(e.target.value)}
          placeholder="e.g. 5.50"
        />

        <FormField
          label="Ex-Date (Optional)"
          name="exDate"
          type="date"
          value={exDate}
          onChange={(e) => setExDate(e.target.value)}
        />
      </div>

      <FormField
        label="Notes"
        name="notes"
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes / reference"
      />
    </form>
  );
}
