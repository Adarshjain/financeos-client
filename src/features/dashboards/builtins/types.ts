// What the Dinero dashboard frame hands a built-in's body, and what each key exports. The shapes are the
// Legacy ones (registry.tsx), so the frame fetches with the existing hooks and passes the same inputs.

import type { ComponentType, ReactElement } from 'react';

import type { BuiltinWidgetResponse, WidgetParams, WidgetResponse } from '@/lib/dashboards.types';
import type { ReportData, SortClause } from '@/lib/reports.types';

/** What a component built-in's body receives. */
export interface BuiltinBodyProps {
  widget: WidgetResponse;
  /** The widget's params, normalized (null/absent dropped). */
  params: WidgetParams;
  className?: string;
}

/** What a template built-in's view receives: the loaded data plus the same runtime controls as a report. */
export interface TemplateViewProps {
  widget: WidgetResponse;
  data: ReportData;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  sort?: SortClause | null;
  onSortChange?: (sort: SortClause | null) => void;
  /** KPI views: makes the figure open the underlying data. */
  onKpiValueClick?: () => void;
}

/**
 * One built-in in the group map. Component built-ins have a `Body` (it fetches its own data); template
 * built-ins have a `View` (the frame fetches the report data and passes it). `Skeleton` is the loading
 * state in the body's own shape; `subtitle` is the param-aware line under the title.
 */
export interface DineroBuiltin {
  Body?: ComponentType<BuiltinBodyProps>;
  View?: ComponentType<TemplateViewProps>;
  Skeleton: ComponentType;
  /** The body is list-style (rows, a table): the frame's Widget drops its body padding so rows sit edge to edge. */
  flush?: boolean;
  subtitle?: (widget: WidgetResponse) => string | ReactElement | null;
}

/** A custom params editor (Add widget / Widget settings) for a built-in whose list params the generic form can't edit. */
export interface BuiltinParamsEditorProps {
  def: BuiltinWidgetResponse;
  value: WidgetParams;
  onChange: (params: WidgetParams) => void;
}
