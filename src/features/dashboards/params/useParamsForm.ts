'use client';

// State of a built-in's params form (Add widget's details step and Widget
// settings): the generic fields' raw values, the registry editor's values,
// their errors and validity, and the params they build. See paramsModel.

import { useCallback, useMemo, useState } from 'react';

import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';

import {
  buildParams,
  fieldErrors,
  fieldParams,
  initialRawValues,
  isFormValid,
  listDefaults,
  type RawValues,
} from './paramsModel';

export interface ParamsForm {
  def: BuiltinWidgetResponse;
  raw: RawValues;
  setRaw: (name: string, value: string) => void;
  /** The registry ParamsEditor's view of the params (stored ones to start). */
  extra: WidgetParams;
  setExtra: (params: WidgetParams) => void;
  errors: Record<string, string | null>;
  /** Pickers report a stored id that is no longer offered; a required one blocks saving. */
  setUnavailable: (name: string, unavailable: boolean) => void;
  valid: boolean;
  /** The params to save. */
  params: () => WidgetParams;
}

/**
 * A params form for `def`, starting from `stored` params (Widget settings) or the defaults (Add). `hasEditor`:
 * the built-in has a params editor of its own for its list params (the caller's registry knows).
 */
export function useParamsForm(def: BuiltinWidgetResponse, stored?: WidgetParams, hasEditor = false): ParamsForm {
  const [raw, setRawValues] = useState<RawValues>(() => initialRawValues(def, stored));
  const [extra, setExtra] = useState<WidgetParams>(() => stored ?? listDefaults(def));
  const [unavailable, setUnavailableMap] = useState<Record<string, boolean>>({});
  // A picker that keeps one form while the chosen built-in changes starts the form over for the new one.
  const [formKey, setFormKey] = useState(def.key);
  if (formKey !== def.key) {
    setFormKey(def.key);
    setRawValues(initialRawValues(def, stored));
    setExtra(stored ?? listDefaults(def));
    setUnavailableMap({});
  }
  const errors = useMemo(() => fieldErrors(def, raw), [def, raw]);
  const setUnavailable = useCallback((name: string, flag: boolean) => {
    setUnavailableMap((prev) => (Boolean(prev[name]) === flag ? prev : { ...prev, [name]: flag }));
  }, []);
  const staleRequired = fieldParams(def).some((p) => p.required && unavailable[p.name]);
  return {
    def,
    raw,
    setRaw: (name, value) => setRawValues((prev) => ({ ...prev, [name]: value })),
    extra,
    setExtra,
    errors,
    setUnavailable,
    valid: isFormValid(def, raw, extra, hasEditor) && !staleRequired,
    params: () => buildParams(def, raw, extra, stored, hasEditor),
  };
}
