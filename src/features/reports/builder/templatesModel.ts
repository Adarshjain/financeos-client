import { REPORT_TEMPLATES } from '@/features/reports/list/reportsListModel';
import type { DatasourceCatalog, ReportDefinition, ReportType } from '@/lib/reports.types';

/** A starting point for a new report: the saved shape of a report, minus its identity. */
export interface TemplateDefinition {
  id: string;
  name: string;
  description: string | null;
  type: ReportType;
  datasource: string;
  definition: ReportDefinition;
}

const labelOf = (id: string): string => REPORT_TEMPLATES.find((t) => t.id === id)?.label ?? id;

/**
 * The templates of "Start from a template", as data over real datasource fields.
 *
 * The list's third template, "Card bills paid on time", was dropped: no datasource has a paid-on-time field.
 */
export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'spend-vs-last-month-by-category',
    name: labelOf('spend-vs-last-month-by-category'),
    description: 'This month’s spend per category beside last month’s.',
    type: 'CHART',
    datasource: 'transactions',
    definition: {
      chartType: 'bar',
      dimension: { field: 'category' },
      measure: { field: 'spend', aggregation: 'sum' },
      filters: [
        { field: 'date', operator: 'this_month' },
        { field: 'isExcluded', operator: 'is', value: false },
      ],
      limit: 8,
      other: true,
      order: 'value_desc',
      comparison: { enabled: true, period: 'previous_period', higherIsBetter: false },
    },
  },
  {
    id: 'dividend-income-by-fy',
    name: labelOf('dividend-income-by-fy'),
    description: 'Dividends received per financial year.',
    type: 'CHART',
    datasource: 'dividends',
    definition: {
      chartType: 'bar',
      dimension: { field: 'payDate', granularity: 'fy' },
      measure: { field: 'amount', aggregation: 'sum' },
      filters: [],
    },
  },
];

/** The template a `?template=` value names; unknown or missing is none. */
export function findTemplate(id: string | string[] | undefined): TemplateDefinition | undefined {
  const one = Array.isArray(id) ? id[0] : id;
  return TEMPLATES.find((t) => t.id === one);
}

/** Every field name the template's definition refers to. */
function templateFields(t: TemplateDefinition): string[] {
  const d = t.definition as unknown as Record<string, unknown>;
  const names: string[] = [];
  const ref = (v: unknown) => {
    const field = (v as { field?: unknown } | undefined)?.field;
    if (typeof field === 'string' && field) names.push(field);
  };
  ref(d.dimension);
  ref(d.series);
  ref(d.subDimension);
  ref(d.measure);
  for (const f of (d.filters as { field: string }[] | undefined) ?? []) ref(f);
  return names;
}

/** True when the datasource's catalog has every field the template uses (a catalog that changed makes it unusable). */
export function templateFits(t: TemplateDefinition, catalog: DatasourceCatalog): boolean {
  return templateFields(t).every((name) => catalog.fields.some((f) => f.name === name));
}
