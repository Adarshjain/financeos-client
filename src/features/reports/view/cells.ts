import { formatMeasure } from '@/features/reports/measureFormat';
import { formatDate } from '@/lib/format';
import { valueLabel } from '@/lib/reports.helpers';
import type { TableColumn } from '@/lib/reports.types';

/** One cell as the table prints it (also the mobile cards' text): a dash when empty. */
export function formatCell(value: unknown, column: TableColumn): string {
  if (value === null || value === undefined || value === '') return '—';
  if (column.type === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(n)) return String(value);
    // Raw rows carry no aggregation; the catalog format hint wins over the name heuristic.
    return formatMeasure(n, { field: column.key, format: column.format ?? undefined });
  }
  if (column.type === 'date') return formatDate(String(value), 'list');
  if (column.type === 'boolean') return value === true || value === 'true' ? 'Yes' : 'No';
  return valueLabel(String(value), column.valueLabels);
}
