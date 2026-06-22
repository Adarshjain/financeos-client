// Pure selectors over the DatasourceCatalog. These translate the catalog into
// the option lists the builder controls render, honoring the field-role /
// allowedInReports / per-type-operator rules. No React, no side effects.

import type { ComboboxOption } from '@/components/Combobox';
import type {
  Aggregation,
  DatasourceCatalog,
  FieldDefinition,
  FieldRole,
  FilterClause,
  ReportType,
} from '@/lib/reports.types';

/** Options for dynamic enum fields (category, account), keyed by field name. */
export type DynamicOptions = Record<string, ComboboxOption[]>;

/**
 * The boolean filter field flagging transactions excluded from reports. It is a
 * normal filter field like any other; new reports just default to filtering it
 * out (see `defaultExcludedFilter`).
 */
export const EXCLUDED_FIELD = 'isExcluded';

export function fieldByName(
  catalog: DatasourceCatalog,
  name: string | undefined,
): FieldDefinition | undefined {
  if (!name) return undefined;
  return catalog.fields.find((f) => f.name === name);
}

export function isDateFieldName(
  catalog: DatasourceCatalog,
  name: string | undefined,
): boolean {
  return fieldByName(catalog, name)?.type === 'date';
}

/** Fields usable as a measure/dimension for `type` (role + allowedInReports). */
export function fieldsFor(
  catalog: DatasourceCatalog,
  role: FieldRole,
  type: ReportType,
): FieldDefinition[] {
  return catalog.fields.filter(
    (f) => f.role === role && f.allowedInReports.includes(type),
  );
}

/** Columns selectable for a raw table: any displayable (non-filter) TABLE field. */
export function columnsFor(catalog: DatasourceCatalog): FieldDefinition[] {
  return catalog.fields.filter(
    (f) => f.role !== 'filter' && f.allowedInReports.includes('TABLE'),
  );
}

/** Any field can be filtered, regardless of role / allowedInReports. */
export function filterableFields(catalog: DatasourceCatalog): FieldDefinition[] {
  return catalog.fields;
}

/**
 * The default `isExcluded is false` clause new reports start with so excluded
 * transactions are hidden by default. It is a regular filter the user can edit
 * or delete (deleting it includes excluded transactions). Returns null if the
 * catalog has no `isExcluded` field.
 */
export function defaultExcludedFilter(
  catalog: DatasourceCatalog,
): FilterClause | null {
  const field = catalog.fields.find((f) => f.name === EXCLUDED_FIELD);
  if (!field) return null;
  const ops = operatorsForField(catalog, field);
  const operator = ops.includes('is') ? 'is' : (ops[0] ?? 'is');
  return { field: EXCLUDED_FIELD, operator, value: false };
}

/** Aggregations a measure field supports — only the ones it lists. */
export function aggsFor(
  catalog: DatasourceCatalog,
  measureName: string | undefined,
): Aggregation[] {
  return fieldByName(catalog, measureName)?.aggregations ?? [];
}

/** Operators valid for a field, keyed by its type (date = absolute + relative). */
export function operatorsForField(
  catalog: DatasourceCatalog,
  field: FieldDefinition,
): string[] {
  if (field.type === 'date') {
    return [...catalog.operators.date.absolute, ...catalog.operators.date.relative];
  }
  return catalog.operators[field.type] ?? [];
}

export function isRelativeDateOp(
  catalog: DatasourceCatalog,
  operator: string,
): boolean {
  return catalog.operators.date.relative.includes(operator);
}

/** Options for an enum field: static `values` inline, dynamic fetched by name. */
export function enumOptionsFor(
  field: FieldDefinition,
  dynamic: DynamicOptions,
): ComboboxOption[] {
  if (field.dynamic) {
    return dynamic[field.name] ?? [];
  }
  return (field.values ?? []).map((v) => ({ id: v, name: v }));
}

/** The editor a (field, operator) pair needs, and the value shape it produces. */
export type ValueKind =
  | 'none'
  | 'scalar'
  | 'scalarEnum'
  | 'multi'
  | 'absoluteDate'
  | 'dateBetween'
  | 'numberBetween'
  | 'relativeAmount'
  | 'boolean';

// Relative date operators that carry a numeric parameter ({ amount }).
const RELATIVE_AMOUNT_OPS = new Set([
  'last_x_days',
  'last_x_months',
  'last_x_years',
]);

export function valueKind(
  catalog: DatasourceCatalog,
  field: FieldDefinition,
  operator: string,
): ValueKind {
  if (operator === 'in' || operator === 'not_in') return 'multi';

  switch (field.type) {
    case 'date':
      if (isRelativeDateOp(catalog, operator)) {
        // Parameterized relative ops need an amount; the rest are valueless.
        return RELATIVE_AMOUNT_OPS.has(operator) || operator.includes('_x_')
          ? 'relativeAmount'
          : 'none';
      }
      return operator === 'between' ? 'dateBetween' : 'absoluteDate';
    case 'number':
      return operator === 'between' ? 'numberBetween' : 'scalar';
    case 'boolean':
      return 'boolean';
    case 'enum':
      return 'scalarEnum';
    case 'string':
    default:
      return 'scalar';
  }
}
