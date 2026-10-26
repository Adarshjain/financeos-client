import type { FieldDefinition, FilterValue } from '@/lib/reports.types';

import { DYNAMIC_OPTIONS_FAILED, type DynamicOptions, type EnumOption } from './catalog';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The server's per-field option cap (ReportFieldValuesService.MAX_VALUES): a full list may omit valid values. */
const MAX_OPTIONS = 500;

/** How a stored value of a dynamic enum field that matches no option reads: a name or an id. */
export function staleValueLabel(field: FieldDefinition, stored: string): string {
  return UUID.test(stored) ? `Unknown ${field.label.toLowerCase()}` : `${stored} (not found)`;
}

/** The loaded options of a dynamic field, or undefined while loading, on failure, for a static field, or when capped. */
function loadedOptions(field: FieldDefinition, dynamic: DynamicOptions): EnumOption[] | undefined {
  if (!field.dynamic || dynamic[DYNAMIC_OPTIONS_FAILED]) return undefined;
  const options = dynamic[field.name];
  return options && options.length >= MAX_OPTIONS ? undefined : options;
}

/** The stale label for a stored value, or null when it matches an option (by id or name) or the options aren't loaded. */
export function staleLabelFor(field: FieldDefinition, dynamic: DynamicOptions, stored: string): string | null {
  const options = loadedOptions(field, dynamic);
  if (!options || stored === '') return null;
  return options.some((o) => o.id === stored || o.name === stored) ? null : staleValueLabel(field, stored);
}

/**
 * Extra dropdown options for stored values that match none of `known` (the option values the dropdown
 * offers). A value equal to an option's name is still valid (the server matches names) and shows as
 * itself; any other is labelled stale. Empty until the field's dynamic options have loaded.
 */
export function staleOptions(
  field: FieldDefinition,
  dynamic: DynamicOptions,
  value: FilterValue | undefined,
  known: string[],
): { value: string; label: string }[] {
  const options = loadedOptions(field, dynamic);
  if (!options) return [];
  const stored = (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === 'string' && v !== '');
  return [...new Set(stored)].filter((v) => !known.includes(v)).map((v) => ({ value: v, label: options.some((o) => o.name === v) ? v : staleValueLabel(field, v) }));
}
