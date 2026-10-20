'use client';

import { FormField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InstrumentType } from '@/lib/types';

import {
  ASSET_CLASS_OPTIONS,
  AUTO_ASSET_CLASS,
  INSTRUMENT_FIELD_LIMITS as LIMITS,
  type InstrumentFormField,
} from './instrumentEdit';

export interface EditInstrumentValues {
  type: InstrumentType;
  name: string;
  symbol: string;
  exchange: string;
  isin: string;
  amfiCode: string;
  yahooSymbol: string;
  currency: string;
  /** An AssetClass, or AUTO_ASSET_CLASS. */
  assetClass: string;
}

interface EditInstrumentFieldsProps {
  values: EditInstrumentValues;
  onChange: (patch: Partial<EditInstrumentValues>) => void;
  errors: Partial<Record<InstrumentFormField, string>>;
}

const LABEL = 'text-xs font-semibold text-slate-700 dark:text-slate-300';
const TRIGGER = 'w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs';
const CONTENT = 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800';

/** The edit-instrument form's inputs; every text input stops at the server's length limit. */
export function EditInstrumentFields({ values, onChange, errors }: EditInstrumentFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={LABEL}>Type</Label>
          <Select value={values.type} onValueChange={(val) => onChange({ type: val as InstrumentType })}>
            <SelectTrigger className={TRIGGER}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className={CONTENT}>
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
          value={values.exchange}
          onChange={(e) => onChange({ exchange: e.target.value })}
          placeholder="e.g. NSE, BSE"
          maxLength={LIMITS.exchange}
          error={errors.exchange}
        />
      </div>

      <FormField
        label="Instrument Name"
        name="name"
        type="text"
        value={values.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="e.g. Reliance Industries Ltd"
        required
        maxLength={LIMITS.name}
        error={errors.name}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Symbol / Ticker"
          name="symbol"
          type="text"
          value={values.symbol}
          onChange={(e) => onChange({ symbol: e.target.value })}
          placeholder="e.g. RELIANCE"
          maxLength={LIMITS.symbol}
          error={errors.symbol}
        />

        <FormField
          label="Currency"
          name="currency"
          type="text"
          value={values.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
          placeholder="INR"
          maxLength={LIMITS.currency}
          error={errors.currency}
        />
      </div>

      <div className="space-y-1.5">
        <Label className={LABEL}>Asset class</Label>
        <Select value={values.assetClass} onValueChange={(val) => onChange({ assetClass: val })}>
          <SelectTrigger className={TRIGGER} aria-label="Asset class">
            <SelectValue placeholder="Auto (catalog)" />
          </SelectTrigger>
          <SelectContent className={CONTENT}>
            <SelectItem value={AUTO_ASSET_CLASS} className="text-xs">
              Auto (catalog)
            </SelectItem>
            {ASSET_CLASS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="ISIN (Optional)"
          name="isin"
          type="text"
          value={values.isin}
          onChange={(e) => onChange({ isin: e.target.value })}
          placeholder="INE002A01018"
          maxLength={LIMITS.isin}
          error={errors.isin}
        />

        <FormField
          label="AMFI Code (For Mutual Funds)"
          name="amfiCode"
          type="text"
          value={values.amfiCode}
          onChange={(e) => onChange({ amfiCode: e.target.value })}
          placeholder="e.g. 120503"
          maxLength={LIMITS.amfiCode}
          error={errors.amfiCode}
        />
      </div>

      <FormField
        label="Yahoo Symbol (For Stocks/ETFs)"
        name="yahooSymbol"
        type="text"
        value={values.yahooSymbol}
        onChange={(e) => onChange({ yahooSymbol: e.target.value })}
        placeholder="e.g. RELIANCE.NS"
        maxLength={LIMITS.yahooSymbol}
        error={errors.yahooSymbol}
      />
    </>
  );
}
