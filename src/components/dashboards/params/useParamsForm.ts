'use client';

// The Legacy form hook: the shared one (`@/features/dashboards/params/useParamsForm`) told which built-ins have
// a params editor in the Legacy registry. See paramsModel.

import {
  type ParamsForm,
  useParamsForm as useParamsFormBase,
} from '@/features/dashboards/params/useParamsForm';
import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';

import { builtinParamsEditor } from '../builtins/registry';

export type { ParamsForm };

/** A params form for `def`, starting from `stored` params (Widget settings) or the defaults (Add). */
export function useParamsForm(def: BuiltinWidgetResponse, stored?: WidgetParams): ParamsForm {
  return useParamsFormBase(def, stored, builtinParamsEditor(def.key) != null);
}
