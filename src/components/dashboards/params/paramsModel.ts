// The params form model of a built-in widget lives in `@/features/dashboards/params/paramsModel` (shared with
// Dinero). Legacy keeps only what depends on its own registry: which built-ins have a params editor.

import {
  buildParams as buildParamsBase,
  hasEditableParams as hasEditableParamsBase,
  isFormValid as isFormValidBase,
} from '@/features/dashboards/params/paramsModel';
import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';

import { builtinParamsEditor } from '../builtins/registry';

export * from '@/features/dashboards/params/paramsModel';

const hasEditor = (def: BuiltinWidgetResponse) => builtinParamsEditor(def.key) != null;

/** Whether the built-in has anything to edit: a generic field, or list params with a registered editor. */
export const hasEditableParams = (def: BuiltinWidgetResponse): boolean => hasEditableParamsBase(def, hasEditor(def));

/** Whether the form can be saved: every field valid, no list param (with an editor) empty or missing when required. */
export const isFormValid = (def: BuiltinWidgetResponse, raw: Record<string, string>, extra: WidgetParams): boolean =>
  isFormValidBase(def, raw, extra, hasEditor(def));

/** The params to save (see the shared model's `buildParams`). */
export const buildParams = (
  def: BuiltinWidgetResponse,
  raw: Record<string, string>,
  extra: WidgetParams,
  stored: WidgetParams = {},
): WidgetParams => buildParamsBase(def, raw, extra, stored, hasEditor(def));
