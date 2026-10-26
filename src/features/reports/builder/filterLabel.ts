import type { DatasourceCatalog, FilterClause } from '@/lib/reports.types';

import { type DynamicOptions, enumOptionsFor, fieldByName, valueKind } from './catalog';
import { humanizeToken } from './labels';
import { staleLabelFor } from './staleDynamicValue';

const lower = (token: string): string => humanizeToken(token).toLowerCase();

/** "last 90 days" for last_x_days with {amount: 90}. */
function relativeText(operator: string, amount: number): string {
  return lower(operator).replace(/\bn\b/, String(amount));
}

/** The text of a filter chip: "Date · last 90 days", "Excluded · false", "Category · is Food & dining". */
export function describeFilter(catalog: DatasourceCatalog, clause: FilterClause, dynamic: DynamicOptions): string {
  const field = fieldByName(catalog, clause.field);
  if (!field) return clause.field;
  const kind = valueKind(catalog, field, clause.operator);
  const v = clause.value;
  const optionName = (stored: string): string => {
    const option = enumOptionsFor(field, dynamic).find((o) => o.id === stored || o.name === stored);
    return option?.name ?? staleLabelFor(field, dynamic, stored) ?? stored;
  };
  let text: string;
  switch (kind) {
    case 'none':
      text = lower(clause.operator);
      break;
    case 'relativeAmount':
      text = relativeText(clause.operator, v && typeof v === 'object' && 'amount' in v ? v.amount : 1);
      break;
    case 'boolean':
      text = v === false ? 'false' : 'true';
      break;
    case 'dateBetween':
    case 'numberBetween': {
      const r = v && typeof v === 'object' && 'from' in v ? v : null;
      text = r && String(r.from) !== '' && String(r.to) !== '' ? `${lower(clause.operator)} ${r.from} – ${r.to}` : `${lower(clause.operator)} …`;
      break;
    }
    case 'multi': {
      const list = Array.isArray(v) ? v : [];
      text = list.length === 0 ? `${lower(clause.operator)} …` : `${lower(clause.operator)} ${list.map(optionName).join(', ')}`;
      break;
    }
    case 'scalarEnum':
      text = typeof v === 'string' && v !== '' ? `${lower(clause.operator)} ${optionName(v)}` : `${lower(clause.operator)} …`;
      break;
    default:
      text = v === undefined || v === '' ? `${lower(clause.operator)} …` : `${lower(clause.operator)} ${String(v)}`;
  }
  return `${field.label} · ${text}`;
}
