import type { CreateCorporateActionRequest } from '@/lib/api/types';
import type { CorporateActionItem, CorporateActionKind } from '@/lib/investments.types';

import type { InstrumentRef } from '../investmentsFormat';

export { instrumentLabel, type InstrumentRef } from '../investmentsFormat';

export interface CorporateActionForm {
  instrument: InstrumentRef | null;
  type: CorporateActionKind;
  exDate: string;
  ratioFrom: string;
  ratioTo: string;
  /** The child (demerger) or the acquirer (merger). */
  target: InstrumentRef | null;
  costAllocationPct: string;
  cashInLieu: string;
  notes: string;
}

export type FormField = 'instrument' | 'exDate' | 'ratioFrom' | 'ratioTo' | 'target' | 'costAllocationPct';
export type FormErrors = Partial<Record<FormField, string>>;

export const hasTarget = (type: CorporateActionKind): boolean => type === 'demerger' || type === 'merger';

/** The form for a new action (today, 1 → 2, 20% for a demerger) or filled from the saved one. */
export function initialForm(args: {
  today: string;
  instrument?: InstrumentRef;
  type?: CorporateActionKind;
  action?: CorporateActionItem;
}): CorporateActionForm {
  const { action } = args;
  if (action) {
    return {
      instrument: { id: action.instrumentId, name: action.instrumentName, symbol: action.instrumentSymbol },
      type: action.type,
      exDate: action.exDate.slice(0, 10),
      ratioFrom: action.ratioFrom != null ? String(action.ratioFrom) : '',
      ratioTo: action.ratioTo != null ? String(action.ratioTo) : '',
      target: action.targetInstrumentId
        ? { id: action.targetInstrumentId, name: action.targetInstrumentName ?? 'Instrument', symbol: action.targetInstrumentSymbol }
        : null,
      costAllocationPct: action.costAllocationPct != null ? String(action.costAllocationPct) : '20',
      cashInLieu: action.fractionalCashInLieu ? String(action.fractionalCashInLieu) : '',
      notes: action.notes ?? '',
    };
  }
  return {
    instrument: args.instrument ?? null,
    type: args.type ?? 'split',
    exDate: args.today,
    ratioFrom: '1',
    ratioTo: '2',
    target: null,
    costAllocationPct: '20',
    cashInLieu: '',
    notes: '',
  };
}

const positiveInt = (text: string): number | null => {
  const n = Number(text);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** What stops the form from being saved, per field (the messages of the Legacy dialog). */
export function validateForm(form: CorporateActionForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.instrument) errors.instrument = 'Select an instrument.';
  if (positiveInt(form.ratioFrom) == null) errors.ratioFrom = 'Enter a whole number above zero.';
  if (positiveInt(form.ratioTo) == null) errors.ratioTo = 'Enter a whole number above zero.';
  if (form.type === 'bonus' && !errors.ratioFrom && !errors.ratioTo && Number(form.ratioTo) <= Number(form.ratioFrom)) {
    errors.ratioTo = 'After must be more than Before: a 1:1 bonus is 1 → 2.';
  }
  if (form.type === 'split' && !errors.ratioFrom && !errors.ratioTo && Number(form.ratioTo) === Number(form.ratioFrom)) {
    errors.ratioTo = 'A split needs different Before and After numbers.';
  }
  if (!form.exDate) errors.exDate = 'Ex-date is required.';
  if (hasTarget(form.type)) {
    if (!form.target) {
      errors.target = `${form.type === 'merger' ? 'Acquirer' : 'Child'} instrument is required.`;
    } else if (form.target.id === form.instrument?.id) {
      errors.target = 'Must be different from the instrument.';
    }
    if (form.type === 'demerger') {
      const pct = Number(form.costAllocationPct);
      if (!pct || pct <= 0 || pct > 100) errors.costAllocationPct = 'Enter a percentage above 0 and up to 100.';
    }
  }
  return errors;
}

/** The request the server takes to save, preview or update the action. Null while the form is not valid. */
export function requestBody(form: CorporateActionForm): CreateCorporateActionRequest | null {
  if (Object.keys(validateForm(form)).length > 0) return null;
  const merging = hasTarget(form.type);
  return {
    type: form.type,
    ratioFrom: positiveInt(form.ratioFrom)!,
    ratioTo: positiveInt(form.ratioTo)!,
    exDate: form.exDate,
    notes: form.notes.trim() || undefined,
    targetInstrumentId: merging ? form.target!.id : undefined,
    costAllocationPct: form.type === 'demerger' ? Number(form.costAllocationPct) : undefined,
    fractionalCashInLieu: merging ? (Number(form.cashInLieu) || 0) : undefined,
  };
}

/** The ratio group's heading and its two field labels, per kind. */
export function ratioCopy(type: CorporateActionKind): { heading: string; from: string; to: string; hint?: string } {
  if (type === 'merger') return { heading: 'Swap ratio (transferor held → acquirer received)', from: 'Held', to: 'Received' };
  if (type === 'demerger') return { heading: 'Share entitlement ratio (parent held → child received)', from: 'Held', to: 'Received' };
  const base = { heading: 'Ratio (units before → units after)', from: 'Before', to: 'After' };
  return type === 'bonus' ? { ...base, hint: 'For a 1:1 bonus issue, enter 1 → 2.' } : base;
}

export const KIND_OPTIONS: { value: CorporateActionKind; label: string }[] = [
  { value: 'split', label: 'Stock split' },
  { value: 'bonus', label: 'Bonus issue' },
  { value: 'demerger', label: 'Demerger / spin-off' },
  { value: 'merger', label: 'Merger / amalgamation' },
];
