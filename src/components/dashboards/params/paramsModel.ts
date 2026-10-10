// The params form of a built-in widget, driven entirely by the server's param
// specs (BuiltinParamResponse): which params get a field and of what kind,
// their labels, initial values, validation, and the params object they save.
//
// Field kinds: `int` → a bounded number input; `uuid` with a `ref` → a picker
// of open credit cards / open accounts / active loans; `enum` → a select of
// its options; `string_list` → the built-in's own ParamsEditor from the client
// registry (no field without one). Anything else is not editable here and its
// stored value is carried through untouched.

import type { BuiltinParamResponse, BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';

import { builtinParamsEditor } from '../builtins/registry';

export type ParamRef = 'credit_card' | 'account' | 'loan';
export type ParamFieldKind = 'int' | ParamRef | 'enum';

/** Raw field values, keyed by param name: the int's text, a picked id/option, or '' (unset / "All"). */
export type RawValues = Record<string, string>;

const REFS: readonly string[] = ['credit_card', 'account', 'loan'];

/** The generic field a param gets, or null when it has none (string_list goes to the registry editor). */
export function paramFieldKind(param: BuiltinParamResponse): ParamFieldKind | null {
  if (param.type === 'int') return 'int';
  if (param.type === 'uuid' && param.ref && REFS.includes(param.ref)) return param.ref as ParamRef;
  if (param.type === 'enum' && (param.options?.length ?? 0) > 0) return 'enum';
  return null;
}

/** The params that get a generic field. */
export function fieldParams(def: BuiltinWidgetResponse): BuiltinParamResponse[] {
  return def.params.filter((p) => paramFieldKind(p) != null);
}

/** The string_list params, edited by the built-in's registry ParamsEditor when it has one. */
export function listParams(def: BuiltinWidgetResponse): BuiltinParamResponse[] {
  return def.params.filter((p) => p.type === 'string_list');
}

/** Whether the built-in has anything to edit: a generic field, or list params with a registered editor. */
export function hasEditableParams(def: BuiltinWidgetResponse): boolean {
  if (fieldParams(def).length > 0) return true;
  return listParams(def).length > 0 && builtinParamsEditor(def.key) != null;
}

const NAMED_LABELS: Record<string, string> = { days: 'Days ahead', n: 'How many', months: 'Months' };
const REF_LABELS: Record<ParamRef, string> = { credit_card: 'Card', account: 'Account', loan: 'Loan' };

/** "camelCase" / "snake_case" → "Sentence case". */
export function humanize(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
}

/** A field's label: by its ref ("Card"), a known name ("Days ahead"), else the name humanized. */
export function paramLabel(param: BuiltinParamResponse): string {
  const kind = paramFieldKind(param);
  if (kind === 'credit_card' || kind === 'account' || kind === 'loan') return REF_LABELS[kind];
  return NAMED_LABELS[param.name] ?? humanize(param.name);
}

/** A field's starting text: the stored value, else the server default, else unset. */
function initialRaw(param: BuiltinParamResponse, stored: unknown): string {
  const isInt = paramFieldKind(param) === 'int';
  const raw = (value: unknown): string | null => {
    if (isInt) return typeof value === 'number' ? String(value) : null;
    return typeof value === 'string' ? value : null;
  };
  return raw(stored) ?? raw(param.defaultValue) ?? '';
}

/** The starting raw values for a built-in's fields, from stored params (Widget settings) or defaults (Add). */
export function initialRawValues(def: BuiltinWidgetResponse, stored: WidgetParams = {}): RawValues {
  return Object.fromEntries(fieldParams(def).map((p) => [p.name, initialRaw(p, stored[p.name])]));
}

/** An int field's error, or null when it is valid (or blank and optional). */
export function intError(param: BuiltinParamResponse, raw: string): string | null {
  if (raw.trim() === '') return param.required ? 'Required' : null;
  const n = Number(raw);
  if (!Number.isInteger(n)) return 'Enter a whole number';
  if (param.min != null && n < param.min) return `At least ${param.min}`;
  if (param.max != null && n > param.max) return `At most ${param.max}`;
  return null;
}

/** A field's error, or null. Pickers and enums only fail when required and unset. */
export function fieldError(param: BuiltinParamResponse, raw: string): string | null {
  if (paramFieldKind(param) === 'int') return intError(param, raw);
  return param.required && raw === '' ? 'Required' : null;
}

/** The list params' server defaults: what a registry editor starts from when adding a widget. */
export function listDefaults(def: BuiltinWidgetResponse): WidgetParams {
  const out: WidgetParams = {};
  for (const p of listParams(def)) if (p.defaultValue != null) out[p.name] = p.defaultValue;
  return out;
}

/**
 * Whether a list param blocks saving (the registry editor shows its own hint):
 * an explicitly empty list never saves, required or not (an optional list is
 * either absent — the server default applies — or has items); a required one
 * must be a list.
 */
function listMissing(param: BuiltinParamResponse, value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  return param.required;
}

/** Every field's error, keyed by param name (null = valid). */
export function fieldErrors(def: BuiltinWidgetResponse, raw: RawValues): Record<string, string | null> {
  return Object.fromEntries(fieldParams(def).map((p) => [p.name, fieldError(p, raw[p.name] ?? '')]));
}

/** Whether the form can be saved: every field valid, no list param (with an editor) empty or missing when required. */
export function isFormValid(def: BuiltinWidgetResponse, raw: RawValues, extra: WidgetParams): boolean {
  if (Object.values(fieldErrors(def, raw)).some(Boolean)) return false;
  if (!builtinParamsEditor(def.key)) return true;
  return !listParams(def).some((p) => listMissing(p, extra[p.name]));
}

/**
 * The params to save. Starts from the stored params (so anything this form
 * does not edit is kept), applies the registry editor's values for list
 * params, then each field: a number for an int, the id/option for a picker or
 * enum; an unset field (blank int, "All", no option) is dropped so the server
 * default applies.
 */
export function buildParams(
  def: BuiltinWidgetResponse,
  raw: RawValues,
  extra: WidgetParams,
  stored: WidgetParams = {},
): WidgetParams {
  const params: WidgetParams = { ...stored };
  if (builtinParamsEditor(def.key)) {
    for (const p of listParams(def)) {
      if (extra[p.name] === undefined) delete params[p.name];
      else params[p.name] = extra[p.name];
    }
  }
  for (const p of fieldParams(def)) {
    const value = (raw[p.name] ?? '').trim();
    if (value === '') delete params[p.name];
    else params[p.name] = paramFieldKind(p) === 'int' ? Number(value) : value;
  }
  return params;
}
