import { buildFilter, dateBetween, numberBetween, relativeAmount } from '@/lib/reports.helpers';
import type { DatasourceCatalog, FieldDefinition, FilterClause } from '@/lib/reports.types';

import { valueKind } from './catalog';

/** A fresh clause for (field, operator) with an empty default value per kind. */
export function defaultFilterClause(
  catalog: DatasourceCatalog,
  field: FieldDefinition,
  operator: string
): FilterClause {
  switch (valueKind(catalog, field, operator)) {
    case 'none':
      return buildFilter(field.name, operator);
    case 'multi':
      return buildFilter(field.name, operator, []);
    case 'numberBetween':
      return buildFilter(field.name, operator, numberBetween(0, 0));
    case 'dateBetween':
      return buildFilter(field.name, operator, dateBetween('', ''));
    case 'relativeAmount':
      return buildFilter(field.name, operator, relativeAmount(1));
    case 'boolean':
      return buildFilter(field.name, operator, true);
    default:
      return buildFilter(field.name, operator, '');
  }
}
