// Pure helpers for showing a raw table's rows as cards (phones): which column
// titles a card, which one is its figure, and the muted line made of the rest.
// Driven only by column metadata, so any datasource's table reads as cards.

import type { TableColumn, TableRow } from '@/lib/reports.types';

import { formatCell } from './TableView';

export interface CardLayout {
  /** The card's title column; null when the table has no text column. */
  title: TableColumn | null;
  /** The figure on the right; null when the table has no number column. */
  value: TableColumn | null;
  /** Everything else, in column order, for the muted line. */
  meta: TableColumn[];
}

/**
 * Title = the first string column (dates are their own type, so never one), else the first enum,
 * else the first date, else the first column that is not the figure (a loan schedule's "EMI #").
 * Value = `valueKey` when it is a column, else the last currency column, else the last number column.
 */
export function cardLayout(columns: TableColumn[], valueKey?: string | null): CardLayout {
  const numbers = columns.filter((c) => c.type === 'number');
  const value =
    (valueKey ? columns.find((c) => c.key === valueKey) : undefined) ??
    numbers.filter((c) => c.format === 'currency').at(-1) ??
    numbers.at(-1) ??
    null;
  const title =
    columns.find((c) => c.type === 'string') ??
    columns.find((c) => c.type === 'enum') ??
    columns.find((c) => c.type === 'date') ??
    columns.find((c) => c !== value) ??
    null;
  const meta = columns.filter((c) => c !== title && c !== value);
  return { title, value, meta };
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function isFalse(value: unknown): boolean {
  return value === false || value === 'false';
}

/**
 * The meta columns' values as the table prints them, joined with " · ". Empty values are skipped.
 * A bare "Yes" means nothing on a card, so a true boolean prints its column label ("Excluded")
 * and a false one is skipped.
 */
export function cardMetaLine(row: TableRow, meta: TableColumn[]): string {
  return meta
    .filter((c) => !isEmpty(row[c.key]) && !(c.type === 'boolean' && isFalse(row[c.key])))
    .map((c) => (c.type === 'boolean' ? c.label : formatCell(row[c.key], c)))
    .join(' · ');
}
