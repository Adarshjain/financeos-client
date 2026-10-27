'use client';

import { Info } from 'lucide-react';

import { FormField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InstrumentType } from '@/lib/types';

interface ManualInstrumentFormFieldsProps {
  type: InstrumentType;
  onTypeChange: (t: InstrumentType) => void;
  exchange: string;
  setExchange: (e: string) => void;
  name: string;
  setName: (n: string) => void;
  symbol: string;
  onSymbolChange: (s: string) => void;
  currency: string;
  setCurrency: (c: string) => void;
  isin: string;
  setIsin: (i: string) => void;
  amfiCode: string;
  setAmfiCode: (a: string) => void;
  yahooSymbol: string;
  onYahooChange: (y: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ManualInstrumentFormFields({
  type,
  onTypeChange,
  exchange,
  setExchange,
  name,
  setName,
  symbol,
  onSymbolChange,
  currency,
  setCurrency,
  isin,
  setIsin,
  amfiCode,
  setAmfiCode,
  yahooSymbol,
  onYahooChange,
  onSubmit,
}: ManualInstrumentFormFieldsProps) {
  return (
    <>
      {/* Auto-pricing Readiness Helper */}
      <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 space-y-1">
        <div className="font-bold flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          Auto-pricing Requirements
        </div>
        <div className="text-2xs text-slate-600 dark:text-slate-400 space-y-0.5 pl-4">
          <div>
            •{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Stocks / ETFs
            </span>{' '}
            require a <span className="font-semibold">Yahoo Symbol</span>{' '}
            (defaults to{' '}
            <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-2xs">
              SYMBOL.NS
            </code>
            ).
          </div>
          <div>
            •{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Mutual Funds
            </span>{' '}
            require an <span className="font-semibold">AMFI Code</span> (6
            digits).
          </div>
        </div>
      </div>

      <form
        id="create-instrument-form"
        onSubmit={onSubmit}
        className="space-y-3 py-1"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Type
            </Label>
            <Select value={type} onValueChange={(val) => onTypeChange(val as InstrumentType)}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectItem value="stock" className="text-xs">
                  Stock
                </SelectItem>
                <SelectItem value="mutual_fund" className="text-xs">
                  Mutual Fund
                </SelectItem>
                <SelectItem value="etf" className="text-xs">
                  ETF
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <FormField
            label="Exchange"
            name="exchange"
            type="text"
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            placeholder="e.g. NSE, BSE"
          />
        </div>

        <FormField
          label="Instrument Name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Reliance Industries Ltd"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Symbol / Ticker"
            name="symbol"
            type="text"
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            placeholder="e.g. RELIANCE"
          />

          <FormField
            label="Currency"
            name="currency"
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="INR"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="ISIN (Optional)"
            name="isin"
            type="text"
            value={isin}
            onChange={(e) => setIsin(e.target.value)}
            placeholder="INE002A01018"
          />

          <FormField
            label="AMFI Code (For Mutual Funds)"
            name="amfiCode"
            type="text"
            value={amfiCode}
            onChange={(e) => setAmfiCode(e.target.value)}
            placeholder="e.g. 120503"
          />
        </div>

        <FormField
          label="Yahoo Symbol (For Stocks/ETFs)"
          name="yahooSymbol"
          type="text"
          value={yahooSymbol}
          onChange={(e) => onYahooChange(e.target.value)}
          placeholder="e.g. RELIANCE.NS"
        />
      </form>
    </>
  );
}
