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
import { CorporateActionType, Instrument } from '@/lib/types';

import { InstrumentTypeahead } from '../InstrumentTypeahead';

interface CorporateActionFormFieldsProps {
  instrument?: {
    id: string;
    name: string;
    symbol?: string;
  };
  editingActionId: string | null;
  selectedParentInstrument: Instrument | null;
  setSelectedParentInstrument: (inst: Instrument | null) => void;
  type: CorporateActionType;
  setType: (type: CorporateActionType) => void;
  exDate: string;
  setExDate: (d: string) => void;
  targetInstrument: Instrument | null;
  setTargetInstrument: (inst: Instrument | null) => void;
  costAllocationPct: string;
  setCostAllocationPct: (p: string) => void;
  ratioFrom: string;
  setRatioFrom: (r: string) => void;
  ratioTo: string;
  setRatioTo: (r: string) => void;
  heldQuantity?: number;
  hasValidRatio: boolean;
  fracShares: number;
  wholeShares: number;
  showCashInLieuField: boolean;
  fractionalCashInLieu: string;
  setFractionalCashInLieu: (f: string) => void;
  notes: string;
  setNotes: (n: string) => void;
}

export function CorporateActionFormFields({
  instrument,
  editingActionId,
  selectedParentInstrument,
  setSelectedParentInstrument,
  type,
  setType,
  exDate,
  setExDate,
  targetInstrument,
  setTargetInstrument,
  costAllocationPct,
  setCostAllocationPct,
  ratioFrom,
  setRatioFrom,
  ratioTo,
  setRatioTo,
  heldQuantity,
  hasValidRatio,
  fracShares,
  wholeShares,
  showCashInLieuField,
  fractionalCashInLieu,
  setFractionalCashInLieu,
  notes,
  setNotes,
}: CorporateActionFormFieldsProps) {
  return (
    <>
      {!instrument && !editingActionId && (
        <div className="space-y-1 min-w-0">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words">
            Parent Instrument *
          </Label>
          <InstrumentTypeahead
            selectedInstrument={selectedParentInstrument}
            onSelect={setSelectedParentInstrument}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Action Type
          </Label>
          <Select
            value={type}
            onValueChange={(val) => setType(val as CorporateActionType)}
          >
            <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectItem value="split" className="text-xs">
                Stock Split
              </SelectItem>
              <SelectItem value="bonus" className="text-xs">
                Bonus Issue
              </SelectItem>
              <SelectItem value="demerger" className="text-xs">
                Demerger / Spin-off
              </SelectItem>
              <SelectItem value="merger" className="text-xs">
                Merger / Amalgamation
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <FormField
          label="Ex-Date"
          name="exDate"
          type="date"
          value={exDate}
          onChange={(e) => setExDate(e.target.value)}
          required
        />
      </div>

      {(type === 'demerger' || type === 'merger') && (
        <div className="space-y-2 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 min-w-0">
          <div className="space-y-1 min-w-0">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words">
              {type === 'merger'
                ? 'Surviving (Acquirer) Instrument *'
                : 'Target (Child) Instrument *'}
            </Label>
            <InstrumentTypeahead
              selectedInstrument={targetInstrument}
              onSelect={setTargetInstrument}
            />
          </div>

          {type === 'demerger' && (
            <FormField
              label="Cost Allocation % (Sec 49(2C)) *"
              name="costAllocationPct"
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={costAllocationPct}
              onChange={(e) => setCostAllocationPct(e.target.value)}
              placeholder="e.g. 20.0"
              required
            />
          )}
        </div>
      )}

      <div className="space-y-1 min-w-0">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words">
          {type === 'merger'
            ? 'Swap Ratio (transferor held → acquirer received)'
            : type === 'demerger'
            ? 'Share Entitlement Ratio (parent held → child received)'
            : 'Ratio (units before → units after)'}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
          <FormField
            label={
              type === 'merger'
                ? 'Transferor Shares Held'
                : type === 'demerger'
                ? 'Parent Shares Held'
                : 'Ratio From (Held)'
            }
            name="ratioFrom"
            type="number"
            step="1"
            min="1"
            value={ratioFrom}
            onChange={(e) => setRatioFrom(e.target.value)}
            required
          />
          <FormField
            label={
              type === 'merger'
                ? 'Acquirer Shares Received'
                : type === 'demerger'
                ? 'Child Shares Received'
                : 'Ratio To (Resulting)'
            }
            name="ratioTo"
            type="number"
            step="1"
            min="1"
            value={ratioTo}
            onChange={(e) => setRatioTo(e.target.value)}
            required
          />
        </div>
        <p className="text-2xs text-slate-500 italic break-words">
          {type === 'merger'
            ? 'Example: HDFC → HDFC Bank was 25 → 42.'
            : type === 'demerger'
            ? 'Example: For 1 child share per 2 parent shares held, enter 2 → 1.'
            : 'Example: For a 2-for-1 split, enter 1 → 2. For a 1:1 bonus issue, enter 1 → 2.'}
        </p>
      </div>

      {(type === 'demerger' || type === 'merger') && (
        <div className="space-y-2 pt-1 min-w-0">
          {heldQuantity !== undefined &&
            heldQuantity > 0 &&
            hasValidRatio &&
            fracShares > 0 && (
              <div className="p-2.5 rounded-md bg-purple-100/60 dark:bg-purple-950/40 text-xs text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 break-words">
                You&apos;ll receive{' '}
                <strong className="font-semibold">{wholeShares}</strong> whole
                shares + cash-in-lieu for{' '}
                <strong className="font-semibold">{fracShares}</strong> fractional
                shares.
              </div>
            )}

          {showCashInLieuField && (
            <FormField
              label="Cash-in-lieu received (₹)"
              name="fractionalCashInLieu"
              type="number"
              step="0.01"
              min="0"
              value={fractionalCashInLieu}
              onChange={(e) => setFractionalCashInLieu(e.target.value)}
              placeholder="0.00"
              hint="Leave 0 if not yet known — you can edit this action later."
            />
          )}
        </div>
      )}

      <FormField
        label="Notes"
        name="notes"
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional reference / details"
      />
    </>
  );
}
