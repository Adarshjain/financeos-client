// What an Upcoming row says about its kind: the row subtitle ("Card bill", "EMI", "Lending", "Statement").

import { cellText } from '@/features/dashboards/builtins/builtinModel';
import type { TableColumn, TableRow } from '@/lib/reports.types';

/** The obligations datasource's `kind` values in words, for when the result carries no value labels. */
export const UPCOMING_KIND_LABELS: Readonly<Record<string, string>> = {
  card_bill: 'Card bill',
  emi: 'EMI',
  lending_return: 'Lending',
  statement_expected: 'Statement',
};

/** A row's kind in words: the column's own value label when the server sends one, else the map; null when unknown. */
export function upcomingKindLabel(row: TableRow, kindColumn: TableColumn | undefined): string | null {
  const kind = cellText(row, 'kind');
  if (!kind) return null;
  return kindColumn?.valueLabels?.[kind] ?? UPCOMING_KIND_LABELS[kind] ?? null;
}
