// Pure helpers behind editing an instrument for the signed-in user's account:
// the server's field limits, the asset-class options, the "Edited for your
// account" wording and how a 400 is split into inline field / form errors.

import { ApiError } from '@/lib/api/client';
import type { AssetClass, Instrument } from '@/lib/types';

/** The server's @Size limits on InstrumentRequest (the form stops typing past them). */
export const INSTRUMENT_FIELD_LIMITS = {
  name: 255,
  symbol: 50,
  exchange: 20,
  isin: 50,
  amfiCode: 50,
  yahooSymbol: 50,
  currency: 10,
} as const;

export type InstrumentFormField = keyof typeof INSTRUMENT_FIELD_LIMITS;

/** The asset-class select's "Auto (catalog)" value — sent to the server as null. */
export const AUTO_ASSET_CLASS = 'AUTO';

export const ASSET_CLASS_OPTIONS: ReadonlyArray<{ value: AssetClass; label: string }> = [
  { value: 'EQUITY', label: 'Equity' },
  { value: 'DEBT', label: 'Debt' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'INTERNATIONAL', label: 'International' },
  { value: 'OTHER', label: 'Other' },
];

/** The select value for an instrument: its class when the user pinned one, else Auto. */
export function assetClassSelection(instrument: Instrument): string {
  const pinned = instrument.overriddenFields?.includes('assetClass');
  return pinned && instrument.assetClass ? instrument.assetClass : AUTO_ASSET_CLASS;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'name',
  symbol: 'symbol',
  exchange: 'exchange',
  currency: 'currency',
  type: 'type',
  assetClass: 'asset class',
};

/** "name, symbol and asset class" — the overridden fields in words. */
export function describeOverriddenFields(fields: readonly string[] | null | undefined): string {
  const words = (fields ?? []).map((f) => FIELD_LABELS[f] ?? f);
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** Whether the user has edits of their own on this instrument. */
export function isOverridden(instrument: Instrument): boolean {
  return Boolean(instrument.overridden || (instrument.overriddenFields?.length ?? 0) > 0);
}

export interface InstrumentFormErrors {
  /** Per-field messages from a bean-validation 400 (keys are request field names). */
  fields: Partial<Record<InstrumentFormField, string>>;
  /** A form-level message (e.g. the identifier-repoint 400). */
  form: string | null;
}

/**
 * Splits a 400 into inline errors: a VALIDATION_ERROR with field details maps to
 * those fields, any other 400 becomes the form message. Null for anything that
 * is not a 400 (the caller toasts those).
 */
export function instrumentFormErrors(err: unknown): InstrumentFormErrors | null {
  if (!(err instanceof ApiError) || err.status !== 400) return null;
  const details = err.response?.details ?? null;
  const fields: InstrumentFormErrors['fields'] = {};
  let unmatched: string | null = null;
  if (details) {
    for (const [key, message] of Object.entries(details)) {
      if (key in INSTRUMENT_FIELD_LIMITS) {
        fields[key as InstrumentFormField] = message;
      } else {
        unmatched = unmatched ?? message;
      }
    }
  }
  const hasFields = Object.keys(fields).length > 0;
  const form = hasFields ? unmatched : (unmatched ?? err.response?.message ?? err.message ?? null);
  return { fields, form };
}

export type IdentifierField = 'isin' | 'amfiCode' | 'yahooSymbol';

const IDENTIFIER_LABELS: Record<IdentifierField, string> = {
  isin: 'ISIN',
  amfiCode: 'AMFI code',
  yahooSymbol: 'Yahoo symbol',
};

const IDENTIFIER_FIELDS: readonly IdentifierField[] = ['isin', 'amfiCode', 'yahooSymbol'];

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * The server's rule for identifier edits, checked before saving: only an identifier set to a new
 * value picks the instrument the holdings move to, so clearing one (or several) without entering
 * any new one can't change a shared price feed and the server refuses it (400 "Clearing an
 * identifier…"). Returns the inline error for the first cleared field in that case, else null.
 */
export function identifierClearError(
  original: Pick<Instrument, IdentifierField>,
  values: Record<IdentifierField, string>
): { field: IdentifierField; message: string } | null {
  const changedToNew = IDENTIFIER_FIELDS.some((f) => norm(values[f]) !== '' && norm(values[f]) !== norm(original[f]));
  if (changedToNew) return null;
  const cleared = IDENTIFIER_FIELDS.find((f) => norm(original[f]) !== '' && norm(values[f]) === '');
  if (!cleared) return null;
  return {
    field: cleared,
    message: `The ${IDENTIFIER_LABELS[cleared]} can't be cleared for your account alone: the price feed is shared. Enter another ISIN, AMFI code or Yahoo symbol, or set a manual price.`,
  };
}
