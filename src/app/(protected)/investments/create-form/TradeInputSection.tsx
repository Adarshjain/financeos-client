'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Broker, isAccountClosed } from '@/lib/account.types';
import { Instrument, InvestmentTransactionType } from '@/lib/types';
import { formatMoney, toCalendarDate } from '@/lib/utils';

import { InstrumentTypeahead } from '../InstrumentTypeahead';

interface TradeInputSectionProps {
  type: InvestmentTransactionType;
  setType: (type: InvestmentTransactionType) => void;
  selectedBrokerId: string;
  setSelectedBrokerId: (id: string) => void;
  brokerAccounts: Broker[];
  selectedInstrument: Instrument | null;
  setSelectedInstrument: (inst: Instrument | null) => void;
  quantityInput: string;
  setQuantityInput: (q: string) => void;
  priceInput: string;
  setPriceInput: (p: string) => void;
  estGrossValue: number;
  totalCharges: number;
  estNetTotal: number;
}

export function TradeInputSection({
  type,
  setType,
  selectedBrokerId,
  setSelectedBrokerId,
  brokerAccounts,
  selectedInstrument,
  setSelectedInstrument,
  quantityInput,
  setQuantityInput,
  priceInput,
  setPriceInput,
  estGrossValue,
  totalCharges,
  estNetTotal,
}: TradeInputSectionProps) {
  return (
    <>
      {/* Order Side Segmented Switch */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setType('buy')}
          className={`py-2 px-3 text-xs font-black rounded-md transition-all flex items-center justify-center gap-1.5 ${
            type === 'buy'
              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          BUY
        </button>
        <button
          type="button"
          onClick={() => setType('sell')}
          className={`py-2 px-3 text-xs font-black rounded-md transition-all flex items-center justify-center gap-1.5 ${
            type === 'sell'
              ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          SELL
        </button>
      </div>

      {/* Broker Selection */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Broker Account
        </Label>
        <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
          <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-semibold h-9 rounded-lg">
            <SelectValue placeholder="Select broker account..." />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            {brokerAccounts
              .filter((b) => !isAccountClosed(b) || b.id === selectedBrokerId)
              .map((b) => (
                <SelectItem
                  key={b.id}
                  value={b.id}
                  className="text-xs font-medium"
                >
                  {b.name} ({b.provider || 'Broker'}){' '}
                  {b.closedOn ? '(Closed)' : ''}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Instrument Typeahead */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Instrument Master
        </Label>
        <InstrumentTypeahead
          selectedInstrument={selectedInstrument}
          onSelect={(inst) => setSelectedInstrument(inst)}
        />
      </div>

      {/* Quantity & Price Inputs with Live Calculation */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="trade-quantity"
            className="text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Quantity
          </Label>
          <Input
            id="trade-quantity"
            name="quantity"
            type="number"
            step="0.0001"
            min="0"
            placeholder="0"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            required
            className="bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-bold h-9 rounded-lg"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="trade-price"
            className="text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Price per Unit (₹)
          </Label>
          <Input
            id="trade-price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            required
            className="bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-bold h-9 rounded-lg"
          />
        </div>
      </div>

      {/* Live Order Summary Card */}
      {estGrossValue > 0 && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">
              Order Contract Value
            </span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {formatMoney(estGrossValue)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Est. Charges</span>
            <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-400">
              +{formatMoney(totalCharges)}
            </span>
          </div>
          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-black">
            <span className="text-slate-900 dark:text-white">Net Cashflow</span>
            <span
              className={
                type === 'buy'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }
            >
              {type === 'buy' ? '-' : '+'}
              {formatMoney(estNetTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Trade Date */}
      <FormField
        label="Execution Date"
        name="tradeDate"
        type="date"
        defaultValue={toCalendarDate(new Date())}
        required
      />
    </>
  );
}
