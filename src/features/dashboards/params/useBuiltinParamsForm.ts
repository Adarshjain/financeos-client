'use client';

import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';

import { builtinHasParamsEditor } from '../builtins/registry';
import { type ParamsForm, useParamsForm } from './useParamsForm';

/** The params form for a built-in, told whether the Dinero registry has a params editor for its list params. */
export function useBuiltinParamsForm(def: BuiltinWidgetResponse, stored?: WidgetParams): ParamsForm {
  return useParamsForm(def, stored, builtinHasParamsEditor(def.key));
}
