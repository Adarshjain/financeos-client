import type { Aggregation, DatasourceCatalog, ReportCatalog, ReportResponse, ReportType } from '@/lib/reports.types';

import { type BuilderAction, builderReducer, type BuilderState, hydrateState, initialBuilderState } from './builderReducerModel';
import { aggsFor, fieldsFor, isDateFieldName } from './catalog';
import { findTemplate, type TemplateDefinition,templateFits } from './templatesModel';

/** The catalog of one datasource, in the shape the builder's selectors take. */
export function workingCatalog(catalog: ReportCatalog, datasource: string): DatasourceCatalog {
  const ds = catalog.datasources.find((d) => d.name === datasource) ?? catalog.datasources[0];
  return {
    fields: ds ? ds.fields : [],
    operators: catalog.operators,
    billingCycleAccountField: ds?.billingCycleAccountField ?? undefined,
  };
}

export interface EditorInit {
  catalog: ReportCatalog;
  /** A saved report: the editor opens on it. */
  report?: ReportResponse;
  /** `?template=` on the New report page: the draft starts from it. */
  templateId?: string | string[];
}

/** A template as a new (unsaved) draft; null when its datasource is gone or a field it uses is missing. */
function templateState(template: TemplateDefinition, catalog: ReportCatalog): BuilderState | null {
  const ds = catalog.datasources.find((d) => d.name === template.datasource);
  if (!ds || !templateFits(template, workingCatalog(catalog, template.datasource))) return null;
  const state = hydrateState({
    id: '',
    name: template.name,
    description: template.description,
    type: template.type,
    datasource: template.datasource,
    definition: template.definition,
    createdAt: '',
    updatedAt: '',
  });
  return { ...state, mode: 'create', reportId: undefined };
}

/** The draft the editor opens on: the saved report, else the template, else a blank KPI on the first datasource. */
export function initialEditorState({ catalog, report, templateId }: EditorInit): BuilderState {
  if (report) return hydrateState(report);
  const template = findTemplate(templateId);
  const fromTemplate = template ? templateState(template, catalog) : null;
  if (fromTemplate) return fromTemplate;
  const first = catalog.datasources[0]?.name ?? 'transactions';
  return prefillSoleMeasure(initialBuilderState('KPI', workingCatalog(catalog, first), first, false), workingCatalog(catalog, first));
}

type Measure = { field?: string; aggregation?: Aggregation };

/** A measure with its choice made when there is only one: the sole measure field, then its sole aggregation. */
function withSole(catalog: DatasourceCatalog, type: ReportType, m: Measure): Measure {
  if (!m.field) {
    const fields = fieldsFor(catalog, 'measure', type);
    return fields.length === 1 ? { field: fields[0].name, aggregation: fields[0].aggregations?.[0] } : m;
  }
  if (!m.aggregation) {
    const aggs = aggsFor(catalog, m.field);
    return aggs.length === 1 ? { field: m.field, aggregation: aggs[0] } : m;
  }
  return m;
}

/**
 * Chooses the measure of the open KPI or Chart draft when the datasource leaves no choice. It happens as part of
 * the draft's own start (opening, switching format or datasource), so it never reads as an edit.
 */
export function prefillSoleMeasure(state: BuilderState, catalog: DatasourceCatalog): BuilderState {
  if (state.type === 'KPI') {
    const m = withSole(catalog, 'KPI', { field: state.kpi.measure, aggregation: state.kpi.aggregation });
    return m.field === state.kpi.measure && m.aggregation === state.kpi.aggregation
      ? state
      : { ...state, kpi: { ...state.kpi, measure: m.field, aggregation: m.aggregation } };
  }
  if (state.type === 'CHART') {
    const m = withSole(catalog, 'CHART', { field: state.chart.measureField, aggregation: state.chart.measureAggregation });
    return m.field === state.chart.measureField && m.aggregation === state.chart.measureAggregation
      ? state
      : { ...state, chart: { ...state.chart, measureField: m.field, measureAggregation: m.aggregation } };
  }
  return state;
}

/** The editor's reducer: the builder's, plus the sole-measure choice when the format or datasource changes. */
export function makeEditorReducer(catalog: ReportCatalog) {
  return (state: BuilderState, action: BuilderAction): BuilderState => {
    let next = builderReducer(state, action);
    // "Change" needs a comparison, which a date dimension never has: the column goes with it.
    if (action.type === 'CHART_SET' && next.chart.columns?.includes('change') && isDateFieldName(workingCatalog(catalog, next.datasource), next.chart.dimensionField)) {
      const rest = next.chart.columns.filter((c) => c !== 'change');
      next = { ...next, chart: { ...next.chart, columns: rest.length > 0 ? rest : undefined } };
    }
    // A datasource change restarts the KPI; the /ds editor's restart has its comparison off (Comparison: None).
    if (action.type === 'SET_DATASOURCE' && next !== state) next = { ...next, kpi: { ...next.kpi, comparisonEnabled: false } };
    return action.type === 'SET_TYPE' || action.type === 'SET_DATASOURCE'
      ? prefillSoleMeasure(next, workingCatalog(catalog, next.datasource))
      : next;
  };
}

/** The draft as a string, to tell whether it differs from the saved one. */
export const snapshot = (state: BuilderState): string => JSON.stringify(state);
