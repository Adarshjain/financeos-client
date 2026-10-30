// The dashboard editor's draft as one reducer: name, description and the widgets in display order. Widgets keep the
// server's response shape; their `layout.w` follows the width steps and x/y are re-flowed on save (see
// layout/widgetLayout), so a draft is compared and written through `flowLayout`.

import type { WidgetGridLayoutItem } from '@/components/ds/WidgetGrid/WidgetGrid';
import { applyGridLayout, flowLayout, normalizeWidgets } from '@/features/dashboards/layout/widgetLayoutModel';
import { fieldErrors, fieldParams, initialRawValues, paramFieldKind, paramLabel } from '@/features/dashboards/params/paramsModel';
import { isBuiltinWidget, isTextWidget, TEXT_DESCRIPTION_MAX, TEXT_TITLE_MAX, textDescription, toDashboardWidget, widgetMinW } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, DashboardResponse, WidgetParams, WidgetResponse } from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { builtinWidgetResponse, editSignature, reportWidgetResponse, textWidgetResponse, updateTextWidget } from './dashboardEditorModel';

export interface EditorState {
  name: string;
  description: string;
  /** In display order. */
  widgets: WidgetResponse[];
}

export type EditorAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_DESCRIPTION'; description: string }
  | { type: 'ADD_REPORT'; report: Pick<ReportSummaryResponse, 'id' | 'name' | 'type'>; title?: string | null }
  | { type: 'ADD_BUILTIN'; def: BuiltinWidgetResponse; params: WidgetParams; title?: string | null }
  /** A new untitled header on top (the caller may mint it, to open its dialog straight away). */
  | { type: 'ADD_HEADER'; header?: WidgetResponse }
  | { type: 'UPDATE_HEADER'; id: string; change: { title?: string; description?: string } }
  | { type: 'REMOVE'; id: string }
  | { type: 'LAYOUT'; layout: readonly WidgetGridLayoutItem[] }
  | { type: 'SETTINGS'; id: string; params?: WidgetParams; title: string | null }
  | { type: 'RESET'; state: EditorState };

/** The draft a dashboard opens on (a blank one without it): widgets in reading order with widths snapped to steps. */
export function initialEditorState(dashboard?: Pick<DashboardResponse, 'name' | 'description' | 'widgets'>): EditorState {
  return {
    name: dashboard?.name ?? '',
    description: dashboard?.description ?? '',
    widgets: normalizeWidgets(dashboard?.widgets ?? []),
  };
}

export const withTitle = (widget: WidgetResponse, title: string | null | undefined): WidgetResponse =>
  title?.trim() ? { ...widget, title: title.trim() } : widget;

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.name };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.description };
    case 'ADD_REPORT':
      return { ...state, widgets: [...state.widgets, withTitle(reportWidgetResponse(state.widgets, action.report), action.title)] };
    case 'ADD_BUILTIN':
      return {
        ...state,
        widgets: [...state.widgets, withTitle(builtinWidgetResponse(state.widgets, action.def, action.params), action.title)],
      };
    case 'ADD_HEADER':
      return { ...state, widgets: [action.header ?? textWidgetResponse(), ...state.widgets] };
    case 'UPDATE_HEADER':
      return { ...state, widgets: updateTextWidget(state.widgets, action.id, action.change) };
    case 'REMOVE':
      return { ...state, widgets: state.widgets.filter((w) => w.id !== action.id) };
    case 'LAYOUT': {
      const widgets = applyGridLayout(state.widgets, action.layout);
      return widgets === state.widgets ? state : { ...state, widgets };
    }
    case 'SETTINGS':
      return {
        ...state,
        widgets: state.widgets.map((w) =>
          w.id === action.id ? { ...w, title: action.title?.trim() || null, ...(action.params ? { params: action.params } : {}) } : w,
        ),
      };
    case 'RESET':
      return action.state;
  }
}

/** What the draft is compared by: its editable parts, widgets as they would be written. */
export function editorSignature(state: EditorState): string {
  return editSignature(state.name, state.description, flowLayout(state.widgets));
}

/** The request body of a save: the draft as written (positions flowed), name and description trimmed. */
export function saveBody(state: EditorState, isDefault: boolean) {
  return {
    name: state.name.trim(),
    description: state.description.trim() || undefined,
    isDefault,
    widgets: flowLayout(state.widgets).map(toDashboardWidget),
  };
}

const REF_NOUN = { credit_card: 'card', account: 'account', loan: 'loan' } as const;

/** The first thing wrong with one widget, in words that point at it; null when it can be saved. */
function widgetIssue(widget: WidgetResponse, catalog: readonly BuiltinWidgetResponse[]): string | null {
  if (isTextWidget(widget)) {
    const title = widget.title?.trim() ?? '';
    if (!title) return 'Give this header a title.';
    if (title.length > TEXT_TITLE_MAX) return `Header titles can be at most ${TEXT_TITLE_MAX} characters.`;
    if (textDescription(widget).length > TEXT_DESCRIPTION_MAX) return `Header descriptions can be at most ${TEXT_DESCRIPTION_MAX} characters.`;
    return null;
  }
  if (!isBuiltinWidget(widget)) return null;
  if (widget.builtin == null) return 'This widget is no longer available. Remove it to save.';
  const def = catalog.find((d) => d.key === (widget.builtinKey ?? widget.builtin?.key));
  if (def) {
    const errors = fieldErrors(def, initialRawValues(def, (widget.params ?? {}) as WidgetParams));
    for (const param of fieldParams(def)) {
      if (!errors[param.name]) continue;
      const kind = paramFieldKind(param);
      if (kind === 'credit_card' || kind === 'account' || kind === 'loan') return `Pick a ${REF_NOUN[kind]} for this widget.`;
      return `Set ${paramLabel(param).toLowerCase()} for this widget.`;
    }
  }
  if (widget.layout.w < widgetMinW(widget)) return 'This widget is too narrow.';
  return null;
}

/** Widgets that cannot be saved as they are, by id, with the message shown on them. */
export function widgetIssues(widgets: readonly WidgetResponse[], catalog: readonly BuiltinWidgetResponse[]): Map<string, string> {
  const issues = new Map<string, string>();
  for (const widget of widgets) {
    const issue = widgetIssue(widget, catalog);
    if (issue) issues.set(widget.id, issue);
  }
  return issues;
}
